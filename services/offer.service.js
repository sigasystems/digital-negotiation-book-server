import sequelize from "../config/db.js";
import offerRepository from "../repositories/offer.repository.js";
import { createOfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups } from "../utlis/dateFormatter.js";
import { withTransaction, validateOfferData, ensureOfferOwnership, normalizeDateFields, ensureActiveOwner } from "../utlis/offerHelpers.js";
import { Op } from "sequelize";
import {BusinessOwner, Buyer, OfferBuyer, OfferVersion, Offer } from "../models/index.js";
import { generateEmailTemplate, sendEmailWithRetry } from "../utlis/emailTemplate.js";
import transporter from "../config/nodemailer.js";

const offerService = {
  async createOffer(offerBody, user) {
    return withTransaction(sequelize, async (t) => {
      const { id: userId, userRole, businessName, businessOwnerId } = user;

      const {
        offerName,
        buyerId,
        origin,
        destination,
        productName,
        speciesName,
        brand,
        plantApprovalNumber,
        quantity,
        tolerance,
        paymentTerms,
        sizeBreakups = [],
        grandTotal,
        shipmentDate,
        remark,
        offerValidityDate,
        processor,
        draftName,
        draftNo,
      } = offerBody;

      if (!offerName) throw new Error("Offer name is required");
      if (!buyerId) throw new Error("Buyer ID is required");
       if (!origin) throw new Error("Origin is required");
      if (!destination) throw new Error("Destination is required");

      const buyer = await Buyer.findByPk(buyerId, { transaction: t });
      if (!buyer) throw new Error("Buyer not found");

      if (buyer.ownerId !== businessOwnerId) {
        throw new Error(
          "Buyer does not belong to the specified business owner"
        );
      }

      let draft = null;
      if (draftNo) {
        draft = await offerRepository.findDraftById(draftNo, t);
        if (!draft) throw new Error("Draft not found");
      }

      const newOffer = await Offer.create(
        {
          businessOwnerId,
          offerName,
          businessName,
          fromParty: `${businessName} / business_owner`,
          toParty: `${buyer.buyersCompanyName} / buyer`,
          buyerId,
          draftName,
          origin,
          destination,
          processor,
          productName,
          speciesName,
          brand,
          plantApprovalNumber,
          quantity,
          tolerance,
          paymentTerms,
          grandTotal,
          shipmentDate,
          remark,
          offerValidityDate: offerValidityDate || new Date(),
        },
        { transaction: t }
      );

      // Create Offer Version 1
      const firstVersion = await OfferVersion.create(
        {
          buyerId,
          offerId: newOffer.id,
          offerName,
          versionNo: 1,
          fromParty: `${businessName} / business_owner`,
          toParty: `${buyer.buyersCompanyName} / buyer`,
          productName: productName || "Unnamed Product",
          speciesName: speciesName || "Unknown",
          brand: brand || "N/A",
          plantApprovalNumber: plantApprovalNumber || "N/A",
          sizeBreakups: sizeBreakups || [],
          quantity: quantity || null,
          tolerance: tolerance || null,
          paymentTerms: paymentTerms || null,
          grandTotal: grandTotal || null,
          shipmentDate: shipmentDate || null,
          remark: remark || null,
          offerValidityDate: offerValidityDate || new Date(),
        },
        { transaction: t }
      );

      return {
        newOfferCreated: true,
        offer: newOffer,
        version: firstVersion,
      };
    });
  },

    async createOfferVersion(offerId, offerBody, user) {
      return withTransaction(sequelize, async (t) => {
        const { id: userId, userRole, businessName, businessOwnerId } = user;

        const offer = await Offer.findByPk(offerId, { transaction: t });
        if (!offer) throw new Error("Offer not found");

        const buyerId = offer.buyerId;
        if (!buyerId) throw new Error("Buyer missing on offer");

        const buyer = await Buyer.findByPk(buyerId, { transaction: t });
        if (!buyer) throw new Error("Buyer not found");

        if (userRole === "business_owner") {
        if (buyer.ownerId !== businessOwnerId)
          throw new Error("Buyer does not belong to your business");
        } else {
          if (buyer.id !== userId) throw new Error("Unauthorized buyer");
        }

        const fromParty =
          userRole === "business_owner"
            ? `${businessName} / business_owner`
            : `${buyer.buyersCompanyName} / buyer`;

        const toParty =
          userRole === "business_owner"
            ? `${buyer.buyersCompanyName} / buyer`
            : `${businessName} / business_owner`;

        const lastVersion = await OfferVersion.findOne({
          where: { offerId, buyerId },
          order: [["versionNo", "DESC"]],
          transaction: t,
        });

        const nextVersionNo = lastVersion ? lastVersion.versionNo + 1 : 1;

        const {
          productName,
          speciesName,
          brand,
          plantApprovalNumber,
          quantity,
          tolerance,
          paymentTerms,
          sizeBreakups = [],
          grandTotal,
          shipmentDate,
          remark,
        } = offerBody;

        const newVersion = await OfferVersion.create(
          {
            buyerId,
            offerId,
            offerName: offer.offerName,
            versionNo: nextVersionNo,
            fromParty,
            toParty,
            productName: productName ?? offer.productName,
            speciesName: speciesName ?? offer.speciesName,
            brand: brand ?? offer.brand,
            plantApprovalNumber:
              plantApprovalNumber ?? offer.plantApprovalNumber,
            quantity: quantity ?? offer.quantity,
            tolerance: tolerance ?? offer.tolerance,
            paymentTerms: paymentTerms ?? offer.paymentTerms,
            sizeBreakups,
            grandTotal: grandTotal ?? offer.grandTotal,
            shipmentDate: shipmentDate ?? offer.shipmentDate,
            remark: remark ?? offer.remark,
          },
          { transaction: t }
        );

      return {
          newOfferCreated: false,
          offer,
          version: newVersion,
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

    const filters = { businessOwnerId: user.businessOwnerId };
    if (offerId) filters.id = Number(offerId);
    if (offerName) filters.offerName = { [Op.iLike]: `%${offerName}%` };
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

  async getNextOfferName(businessOwnerId) {
  const lastOffer = await offerRepository.findLastOfferByOwner(businessOwnerId);
  if (!lastOffer || !lastOffer.offerName) {
    return "Offer 1";
  }
  const lastName = lastOffer.offerName.trim();
  const match = lastName.match(/(\d+)$/);
  const lastNumber = match ? parseInt(match[1], 10) : 0;
  const nextNumber = lastNumber + 1;

  return `Offer ${nextNumber}`;
}
};

export default offerService;