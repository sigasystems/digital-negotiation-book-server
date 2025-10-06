import sequelize from "../config/db.js";
import { Offer, OfferBuyer, OfferVersion, OfferResult, Buyer, BusinessOwner } from "../models/index.js";
import { Op } from "sequelize";

export const offerNegotiationService = {
  async sendOffer(user, offerId, buyerIds, data) {
    const transaction = await sequelize.transaction();
    try {
      const userId = user?.id;
      const userRole = user?.userRole;
      const businessName = user?.businessName;
      let owner, buyers;

      const offer = await Offer.findByPk(offerId, { transaction });
      if (!offer || offer.status === "close" || offer.isDeleted) {
        throw new Error("Offer not found or closed/deleted");
      }

      if (userRole === "business_owner") {
        buyers = await Buyer.findAll({ where: { id: buyerIds }, transaction });
        if (buyers.length !== buyerIds.length) {
          throw new Error("Some buyers not found");
        }
        for (const buyer of buyers) {
          if (buyer.ownerId !== userId) {
            throw new Error(`Buyer ${buyer.buyersCompanyName} is not registered under your business`);
          }
        }
        owner = await BusinessOwner.findOne({ where: { id: userId, status: "active" }, transaction });
      } else if (userRole === "buyer") {
        const buyer = await Buyer.findByPk(userId, { transaction });
        if (!buyer || !buyerIds?.includes(userId)) {
          throw new Error("Unauthorized buyer");
        }
        buyers = [buyer];
        owner = await BusinessOwner.findOne({ where: { id: buyer.ownerId, status: "active" }, transaction });
      } else {
        throw new Error("Unauthorized role");
      }

      // Ensure OfferBuyer mapping
      const existingOfferBuyers = await OfferBuyer.findAll({
        where: { offerId, buyerId: buyerIds },
        transaction
      });

      const existingBuyerIds = existingOfferBuyers.map(b => b.buyerId);
      const buyerIdsArray = Array.isArray(buyerIds) ? buyerIds : [buyerIds];

      const newOfferBuyers = buyerIdsArray
        .filter(id => !existingBuyerIds.includes(id))
        .map(buyerId => ({
          offerId,
          buyerId,
          ownerId: userRole === "business_owner" ? userId : owner?.id || null,
          status: "open"
        }));

      const createdOfferBuyers = await OfferBuyer.bulkCreate(newOfferBuyers, { transaction, returning: true });
      const allOfferBuyers = [...existingOfferBuyers, ...createdOfferBuyers];

      for (const ob of allOfferBuyers) {
        if (ob.status !== "close") {
          const lastVersion = await OfferVersion.findOne({
            where: { offerBuyerId: ob.id },
            order: [["versionNo", "DESC"]],
            transaction
          });
          const nextVersionNo = lastVersion ? lastVersion.versionNo + 1 : 1;

          let fromParty, toParty;
          const buyer = buyers.find(b => b.id === ob.buyerId);
          if (userRole === "business_owner") {
            fromParty = `${businessName} / business_owner`;
            toParty = `${buyer?.buyersCompanyName} / buyer`;
          } else {
            fromParty = `${buyer?.buyersCompanyName} / buyer`;
            toParty = `${owner?.businessName} / business_owner`;
          }

          await OfferVersion.create({
            offerBuyerId: ob.id,
            versionNo: nextVersionNo,
            fromParty,
            toParty,
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
            status: "open"
          }, { transaction });
        }
      }

      await transaction.commit();
      return { offerId, buyers, owner, businessName, userRole };
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  },

  async respondOffer(user, offerId, buyerId, action) {
    const transaction = await sequelize.transaction();
    try {
      const userId = user?.id;
      const userRole = user?.userRole;

      const offer = await Offer.findByPk(offerId, { transaction });
      if (!offer || offer.status === "close" || offer.isDeleted) {
        throw new Error("Offer not found or closed/deleted");
      }

      const buyer = await Buyer.findByPk(buyerId, { transaction });
      if (!buyer) throw new Error("Buyer not found");

      let owner;
      if (userRole === "business_owner") {
        owner = await BusinessOwner.findByPk(userId, { transaction });
        if (!owner || owner.status !== "active") throw new Error("Inactive business owner");
      } else {
        owner = await BusinessOwner.findByPk(buyer.ownerId, { transaction });
        if (!owner || owner.status !== "active") throw new Error("Inactive buyer owner");
      }

      if (buyer.ownerId !== offer.businessOwnerId) {
        throw new Error("This buyer is not registered under your business.");
      }

      const offerBuyer = await OfferBuyer.findOne({ where: { offerId, buyerId }, transaction });
      if (!offerBuyer) throw new Error("OfferBuyer not found");

      const lastVersion = await OfferVersion.findOne({
        where: { offerBuyerId: offerBuyer.id },
        order: [["versionNo", "DESC"]],
        transaction
      });

     const offerResult = await OfferResult.create({
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
    }, { transaction });

      await transaction.commit();
      return offerResult;
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  },

  async getRecentNegotiations(ownerId, buyerId) {
    const offerBuyers = await OfferBuyer.findAll({
      where: { ...(ownerId && { ownerId }), ...(buyerId && { buyerId }) },
      include: [{ model: OfferVersion, as: "versions", order: [["versionNo", "DESC"]] }]
    });

    return offerBuyers.flatMap(ob =>
      ob.versions.map(v => ({
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

    const latestVersion = await OfferVersion.findOne({
      where: { offerBuyerId: offerBuyer.id },
      order: [["versionNo", "DESC"]]
    });
    if (!latestVersion) return [];

    const versions = await OfferVersion.findAll({
      where: { offerBuyerId: offerBuyer.id, versionNo: { [Op.lte]: latestVersion.versionNo } },
      order: [["versionNo", "ASC"]]
    });

    return versions;
  }
};