import { Offer, OfferBuyer, OfferVersion, OfferResult, Buyer, BusinessOwner } from "../models/index.js";
import { withTransactionOfferNegotiation, ensureActiveOffer, ensureActiveOwner, getLastVersion } from "../utlis/offerHelpers.js";
import { generateEmailTemplate, sendEmailWithRetry } from "../utlis/emailTemplate.js";
import transporter from "../config/nodemailer.js";
import { Op } from "sequelize";

export const offerNegotiationService = {
  async sendOffer(user, offerId, buyerIds, data) {
    return withTransactionOfferNegotiation(async (t) => {
      const { id: userId, userRole, businessName } = user;
      if (!["business_owner", "buyer"].includes(userRole)) throw new Error("Unauthorized role");

      const offer = await ensureActiveOffer(Offer, offerId, t);
      const buyerIdsArr = Array.isArray(buyerIds) ? buyerIds : [buyerIds];
      let owner, buyers;

      if (userRole === "business_owner") {
        buyers = await Buyer.findAll({ where: { id: buyerIdsArr }, transaction: t });
        if (buyers.length !== buyerIdsArr.length) throw new Error("Some buyers not found");
        if (buyers.some(b => b.ownerId !== userId)) throw new Error("One or more buyers not under your business");
        owner = await ensureActiveOwner(BusinessOwner, userId, t);
      } else {
        const buyer = await Buyer.findByPk(userId, { transaction: t });
        if (!buyer || !buyerIdsArr.includes(userId)) throw new Error("Unauthorized buyer");
        buyers = [buyer];
        owner = await ensureActiveOwner(BusinessOwner, buyer.ownerId, t);
      }

      const existing = await OfferBuyer.findAll({
        where: { offerId, buyerId: buyerIdsArr },
        transaction: t,
      });
      const existingIds = existing.map(b => b.buyerId);
      const newMappings = buyerIdsArr
        .filter(id => !existingIds.includes(id))
        .map(buyerId => ({
          offerId,
          buyerId,
          ownerId: userRole === "business_owner" ? userId : owner.id,
          status: "open",
        }));

      const created = await OfferBuyer.bulkCreate(newMappings, { transaction: t, returning: true });
      const allMappings = [...existing, ...created];
      const emailErrors = [];

      for (const ob of allMappings) {
        if (ob.status === "close") continue;

        const lastVersion = await getLastVersion(OfferVersion, ob.id, t);
        const nextVersion = (lastVersion?.versionNo ?? 0) + 1;

        const buyer = buyers.find(b => b.id === ob.buyerId);
        const fromPartyDisplay = userRole === "business_owner"
            ? `${businessName} / business_owner`
            : `${buyer?.buyersCompanyName} / buyer`;

        const toPartyDisplay = userRole === "business_owner"
            ? `${buyer?.buyersCompanyName} / buyer`
            : `${owner?.businessName} / business_owner`;

        const toEmail = buyer?.contactEmail;
        const fromEmail = process.env.EMAIL_USER || "noreply@yourapp.com";

          const offerVersion = await OfferVersion.create({
            offerBuyerId: ob.id,
            versionNo: nextVersion,
            fromParty: fromPartyDisplay,
            toParty: toPartyDisplay,
            offerName: offer.offerName,
            productName: data.productName ?? offer.productName,
            speciesName: data.speciesName ?? offer.speciesName,
            brand: data.brand ?? offer.brand,
            plantApprovalNumber: data.plantApprovalNumber ?? offer.plantApprovalNumber,
            quantity: data.quantity ?? offer.quantity,
            tolerance: data.tolerance ?? offer.tolerance,
            paymentTerms: data.paymentTerms ?? offer.paymentTerms,
            sizeBreakups: data.sizeBreakups ?? offer.sizeBreakups,
            grandTotal: data.grandTotal ?? offer.grandTotal,
            shipmentDate: data.shipmentDate ?? offer.shipmentDate,
            remark: data.remark ?? offer.remark,
            status: "open",
      }, { transaction: t });

      const emailHtml = generateEmailTemplate({
        title: `New Offer: ${offerVersion.offerName}`,
        subTitle: `Hello ${toPartyDisplay},`,
        body: `
          <p>${fromPartyDisplay} has sent you a new offer.</p>
          <ul>
            <li><b>Product:</b> ${offerVersion.productName}</li>
            <li><b>Species:</b> ${offerVersion.speciesName}</li>
            <li><b>Brand:</b> ${offerVersion.brand}</li>
            <li><b>Quantity:</b> ${offerVersion.quantity}</li>
            <li><b>Grand Total:</b> ${offerVersion.grandTotal}</li>
            <li><b>Shipment Date:</b> ${offerVersion.shipmentDate?.toISOString().split('T')[0]}</li>
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
          buyerName: buyer?.buyersCompanyName,
          message: err.message || "Failed to send email",
        });
      }
    }

      return { offerId, buyers, owner, businessName, userRole, emailErrors };
    });
  },

  async respondOffer(user, offerId, buyerId, action) {
    return withTransaction(async (t) => {
      const { id: userId, userRole } = user;
      const offer = await ensureActiveOffer(Offer, offerId, t);
      const buyer = await Buyer.findByPk(buyerId, { transaction: t });
      if (!buyer) throw new Error("Buyer not found");

      const owner =
        userRole === "business_owner"
          ? await ensureActiveOwner(BusinessOwner, userId, t)
          : await ensureActiveOwner(BusinessOwner, buyer.ownerId, t);

      if (buyer.ownerId !== offer.businessOwnerId)
        throw new Error("This buyer is not registered under your business");

      const offerBuyer = await OfferBuyer.findOne({ where: { offerId, buyerId }, transaction: t });
      if (!offerBuyer) throw new Error("OfferBuyer not found");

      const lastVersion = await getLastVersion(OfferVersion, offerBuyer.id, t);

      return OfferResult.create(
        {
        offerVersionId: lastVersion?.id,
        offerId,
        ownerId: owner.id,
        buyerId: buyer.id,
        isAccepted: action === "accept" ? true : null,
        isRejected: action === "reject" ? true : null,
        offerName: offer.offerName,
        ownerName: owner.businessName,
        buyerName: buyer.buyersCompanyName,
        ownerCompanyName: owner.businessName,
        buyerCompanyName: buyer.buyersCompanyName
        },
        { transaction: t }
      );
    });
  },

  async getRecentNegotiations(ownerId, buyerId) {
    const offerBuyers = await OfferBuyer.findAll({
      where: { ...(ownerId && { ownerId }), ...(buyerId && { buyerId }) },
      include: [{ model: OfferVersion, as: "versions", order: [["versionNo", "DESC"]] }],
    });

    return offerBuyers.flatMap((ob) =>
      ob.versions.map((v) => ({
        offerId: v.offerId,
        versionNo: v.versionNo,
        fromParty: v.fromParty,
        toParty: v.toParty,
        productName: v.productName,
        grandTotal: v.grandTotal,
        offerName: v.offerName,
        createdAt: v.createdAt
      }))
    );
  },

  async getLatestNegotiation(ownerId, buyerId) {
    const offerBuyer = await OfferBuyer.findOne({ where: { ...(ownerId && { ownerId }), ...(buyerId && { buyerId }) } });
    if (!offerBuyer) return [];

    const latest = await getLastVersion(OfferVersion, offerBuyer.id);
    if (!latest) return [];

    return OfferVersion.findAll({
      where: { offerBuyerId: offerBuyer.id, versionNo: { [Op.lte]: latest.versionNo } },
      order: [["versionNo", "ASC"]],
    });

  }
};