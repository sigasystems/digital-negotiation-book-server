import sequelize from "../config/db.js";
import offerRepository from "../repositories/offer.repository.js";
import { createOfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups } from "../utlis/dateFormatter.js";
import { withTransaction, validateOfferData, ensureOfferOwnership, normalizeDateFields, ensureActiveOwner } from "../utlis/offerHelpers.js";
import { Op } from "sequelize";
import {BusinessOwner, Buyer, OfferBuyer, OfferVersion} from "../models/index.js";
import { generateEmailTemplate, sendEmailWithRetry } from "../utlis/emailTemplate.js";
import transporter from "../config/nodemailer.js";

const offerService = {
  async createOffer(draftNo, offerBody, user) {
    return withTransaction(sequelize, async (t) => {
      const { offerName, buyerId, ...restData } = offerBody;
      const { id: userId, userRole, businessName, businessOwnerId } = user;

      if (!offerName || typeof offerName !== "string" || !offerName.trim()) {
        throw new Error("Offer name is required and must be a non-empty string");
      }
      if (!["business_owner", "buyer"].includes(userRole)) {
        throw new Error("Unauthorized role");
      }
      if (!businessOwnerId) {
        throw new Error("Business owner ID missing in token");
      }
      if (!businessName) {
        throw new Error("Business name not found in token");
      }

    const draft = await offerRepository.findDraftById(draftNo, t);
    if (!draft) throw new Error("Draft not found");

    if (draft.businessOwnerId !== businessOwnerId) {
      throw new Error("You are not authorized to create an offer for this draft");
    }


    const existingOffers = await offerRepository.findAllOffers({ businessOwnerId });
   if (
        existingOffers?.some(
          (o) => o.offerName?.toLowerCase() === offerName.toLowerCase()
        )
      ) {
        throw new Error("Offer name already exists for this business owner");
      }

      if (!draft.draftProducts || draft.draftProducts.length === 0) {
        throw new Error("Draft must have at least one product before creating an offer");
      }

      const enrichedProducts = (restData.products || []).map((p, index) => {
        const draftProduct = draft.draftProducts[index] || {};
          return {
              ...draftProduct,
              ...p,
              productName: p.productName || draftProduct.productName || "",
              speciesName: p.species || draftProduct.species || "",
            };
      });

      const mergedData = {
        ...draft.dataValues,
        ...restData,
        products: enrichedProducts,
        draftProducts: draft.draftProducts,
      };

      const createdOffer = await offerRepository.createOffer(
        mergedData,
        offerName,
        user,
        t
      );

      const buyerIdsArr = buyerId ? [buyerId] : createdOffer.buyerId ? [createdOffer.buyerId] : [];
      if (buyerIdsArr.length === 0) {
        throw new Error("Buyer ID missing — cannot create offer without a buyer");
      }

      let owner, buyers;
      if (userRole === "business_owner") {
        buyers = await Buyer.findAll({ where: { id: buyerIdsArr }, transaction: t });
        if (buyers.length !== buyerIdsArr.length) throw new Error("Buyer not found");
        if (buyers.some((b) => b.ownerId !== businessOwnerId)) {
          throw new Error("Buyer does not belong to your business");
        }
        owner = await ensureActiveOwner(BusinessOwner, businessOwnerId, t);
      } else {
        const buyer = await Buyer.findByPk(userId, { transaction: t });
        if (!buyer || !buyerIdsArr.includes(userId)) throw new Error("Unauthorized buyer");
        buyers = [buyer];
        owner = await ensureActiveOwner(BusinessOwner, buyer.ownerId, t);
      }

      const newMappings = buyerIdsArr.map((buyerId) => ({
        offerId: createdOffer.id,
        buyerId,
        ownerId: userRole === "business_owner" ? businessOwnerId : owner.id,
        status: "open",
      }));

      const createdMappings = await OfferBuyer.bulkCreate(newMappings, {
        transaction: t,
        returning: true,
      });

      const emailErrors = [];

      const primaryProduct = mergedData.products?.[0] || {};

      for (const ob of createdMappings) {
        const buyer = buyers.find((b) => b.id === ob.buyerId);
        if (!buyer) continue;

        const fromPartyDisplay =
          userRole === "business_owner"
            ? `${businessName} / business_owner`
            : `${buyer.buyersCompanyName} / buyer`;

        const toPartyDisplay =
          userRole === "business_owner"
            ? `${buyer.buyersCompanyName} / buyer`
            : `${owner.businessName} / business_owner`;

        const toEmail = buyer.contactEmail;
        const fromEmail = process.env.EMAIL_USER || "noreply@yourapp.com";
        const offerVersion = await OfferVersion.create(
          {
            buyerId,
            versionNo: 1,
            fromParty: fromPartyDisplay,
            toParty: toPartyDisplay,
            offerName: createdOffer.offerName,
            productName: primaryProduct.productName || "Unnamed Product",
            speciesName: primaryProduct.speciesName || "Unknown",
            brand: mergedData.brand ?? createdOffer.brand,
            plantApprovalNumber:
              mergedData.plantApprovalNumber ?? createdOffer.plantApprovalNumber,
            quantity: mergedData.quantity ?? createdOffer.quantity,
            tolerance: mergedData.tolerance ?? createdOffer.tolerance,
            paymentTerms: mergedData.paymentTerms ?? createdOffer.paymentTerms,
            sizeBreakups: primaryProduct.sizeBreakups ?? [],
            grandTotal: mergedData.grandTotal ?? createdOffer.grandTotal,
            shipmentDate: mergedData.shipmentDate ?? createdOffer.shipmentDate,
            remark: mergedData.remark ?? createdOffer.remark,
            status: "open",
          },
          { transaction: t }
        );

        const emailHtml = generateEmailTemplate({
          title: `New Offer Created: ${offerVersion.offerName}`,
          subTitle: `Hello ${toPartyDisplay},`,
          body: `
            <p>${fromPartyDisplay} has sent you a new offer.</p>
            <ul>
              <li><b>Product:</b> ${offerVersion.productName}</li>
              <li><b>Species:</b> ${offerVersion.speciesName}</li>
              <li><b>Brand:</b> ${offerVersion.brand}</li>
              <li><b>Quantity:</b> ${offerVersion.quantity}</li>
              <li><b>Grand Total:</b> ${offerVersion.grandTotal}</li>
              <li><b>Shipment Date:</b> ${
                offerVersion.shipmentDate
                  ? offerVersion.shipmentDate.toISOString().split("T")[0]
                  : "N/A"
              }</li>
              <li><b>Remarks:</b> ${offerVersion.remark || "N/A"}</li>
            </ul>
          `,
          footer: "Please review and take necessary action.",
        });

        try {
          await sendEmailWithRetry(transporter, {
            from: `"${fromPartyDisplay}" <${fromEmail}>`,
            to: toEmail,
            subject: `New Offer from ${fromPartyDisplay}`,
            html: emailHtml,
          });
        } catch (err) {
          emailErrors.push({
            buyerId: ob.buyerId,
            buyerName: buyer.buyersCompanyName,
            message: err.message || "Failed to send email",
          });
        }
      }

      return {
        offerId: createdOffer.id,
        buyers,
        owner,
        businessName,
        userRole,
        emailErrors,
      };
    });
  },
  async getAllOffers(user, { pageIndex = 0, pageSize = 10, status = null } = {}) {
    const where = { businessOwnerId: user.businessOwnerId,
      ...(status && { status }),
    };

    const offers = await offerRepository.findAllOffers(where);

    const formattedOffers = offers.map((o) => o.toJSON());

    const totalItems = formattedOffers.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const start = pageIndex * pageSize;
    const paginatedOffers = formattedOffers.slice(start, start + pageSize);

    return {
      data: paginatedOffers,
      totalItems,
      totalPages,
      pageIndex,
      pageSize,
    };
  },

  async getOfferById(id, user) {
    const offer = await offerRepository.findOfferById(id);
    if (!offer) throw new Error("Offer not found");
    ensureOfferOwnership(offer, user);
    return offer;
  },

  async updateOffer(id, updates, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);
      if (offer.status === "close" || offer.isDeleted)
        throw new Error("Cannot update a closed or deleted offer");

      normalizeDateFields(updates);
      const validUpdates = validateOfferData(updates, createOfferSchema.partial());

      if (validUpdates.sizeBreakups || validUpdates.total || validUpdates.grandTotal) {
        const validationError = validateSizeBreakups(
          validUpdates.sizeBreakups,
          validUpdates.total,
          validUpdates.grandTotal
        );
        if (validationError) throw new Error(validationError);
      }

      await offerRepository.updateOffer(offer, validUpdates, t);
      return offer;
    });
  },

  async deleteOffer(id, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);
      if (offer.isDeleted) throw new Error("Offer already deleted");

      await offerRepository.updateOffer(offer, { isDeleted: true, status: "close" }, t);
      return offer.id;
    });
  },

  async changeOfferStatus(id, newStatus, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);

      if (offer.isDeleted) throw new Error("Cannot update a deleted offer");
      if (offer.status.toLowerCase() === newStatus.toLowerCase()) {
        throw new Error(`Offer is already ${newStatus.toUpperCase()}`);
      }

      await offerRepository.updateOffer(offer, { status: newStatus }, t);
      return offer;
    });
  },

  closeOffer(id, user) {
    return this.changeOfferStatus(id, "close", user);
  },

  openOffer(id, user) {
    return this.changeOfferStatus(id, "open", user);
  },

  async searchOffers(query, user) {
    let { offerId, offerName, status, isDeleted, page = 1, limit = 20 } = query;
    page = +page || 1;
    limit = +limit || 20;

    const filters = { businessOwnerId: user.id };
    if (offerId) filters.id = +offerId;
    if (offerName) filters.offer_name = { [Op.iLike]: `%${offerName}%` };
    if (status) filters.status = status;
    if (isDeleted !== undefined)
      filters.isDeleted = String(isDeleted).toLowerCase() === "true";

    const { rows, count } = await offerRepository.searchOffers(filters, page, limit);

    return {
      total: count,
      page,
      limit,
      offers: rows,
    };
  },
};

export default offerService;