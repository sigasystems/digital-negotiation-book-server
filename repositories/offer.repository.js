import { Offer, OfferDraft, BusinessOwner, OfferDraftProduct, SizeBreakup, OfferProduct, OfferSizeBreakup, OfferBuyer } from "../models/index.js";

class OfferRepository {

  async findDraftById(draftNo, transaction) {
    return await OfferDraft.findOne({
      where: { draftNo },
      include: [
        {
          model: BusinessOwner,
          as: "businessOwner",
          attributes: ["id", "businessName", "email"],
        },
        {
          model: OfferDraftProduct,
          as: "draftProducts",
          include: [
            {
              model: SizeBreakup,
              as: "sizeBreakups",
              attributes: ["size", "breakup", "price", "condition"],
            },
          ],
        },
      ],
      transaction,
    });
  }

  // Offer CRUD
    async createOffer(data, offerName, user, transaction, buyerId, destination) {
      const { userRole, businessName, buyersCompanyName } = user || {};

      const fromPartyValue =
        userRole === "business_owner"
          ? businessName
          : buyersCompanyName || businessName || "";

      const repoBuyerId = buyerId || (userRole === "buyer" ? user.id : null);

      const offer = await Offer.create({
        businessOwnerId: data.businessOwnerId,
        offerName,
        businessName: businessName || buyersCompanyName || "",
        fromParty: fromPartyValue,
        toParty: data.toParty || null,
        buyerId: repoBuyerId || null,
        destination: destination || data.destination || null,
        origin: data.origin || null,
        processor: data.processor || null,
        plantApprovalNumber: data.plantApprovalNumber || null,
        brand: data.brand || null,
        draftName: data.draftName || null,
        offerValidityDate: data.offerValidityDate || null,
        shipmentDate: data.shipmentDate || null,
        grandTotal: Number(data.grandTotal) || 0,
        quantity: Number(data.quantity) || 0,
        tolerance: data.tolerance || null,
        paymentTerms: data.paymentTerms || null,
        remark: data.remark || null,
        packing: data.packing || null,
        status: "open",
      }, { transaction });

      for (const p of data.products || []) {
        const offerProduct = await OfferProduct.create({
          offerId: offer.id,
          productId: p.productId || null,
          productName: p.productName || "",
          species: p.species || "",
          packing: p.packing || p.packing || null,
          sizeDetails: p.sizeDetails || null,
          breakupDetails: p.breakupDetails || null,
          priceDetails: p.priceDetails || null,
        }, { transaction });

        if (Array.isArray(p.sizeBreakups) && p.sizeBreakups.length > 0) {
          const sizeData = p.sizeBreakups.map(sb => ({
            offerProductId: offerProduct.id,
            size: sb.size || "",
            breakup: sb.breakup || "",
            price: Number(sb.price) || 0,
            condition: sb.condition || "",
          }));
          await OfferSizeBreakup.bulkCreate(sizeData, { transaction });
        }
      }

      return offer;
  }

  async findOfferById(id, transaction) {
    return Offer.findByPk(id, { transaction });
  }

  async updateOffer(offer, updates, transaction) {
    return offer.update(updates, { transaction });
  }

  async findAllOffers(whereClause = {}) {
    return Offer.findAll({ where: whereClause, order: [["createdAt", "DESC"]] });
  }

  async searchOffers(filters, page, limit) {
    const offset = (page - 1) * limit;

    const result = await Offer.findAndCountAll({
      where: {
        ...filters,
      },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return result;
  }

    async getNegotiationsByOfferId(offerId) {
    const offerBuyers = await OfferBuyer.findAll({
      where: { offerId },
      attributes: ["id", "buyerId", "ownerId", "status"],
    });

    if (!offerBuyers.length) return { offerBuyers: [], versions: [] };

    const buyerId = offerBuyers.map((ob) => ob.id);

    const versions = await OfferVersion.findAll({
      where: { buyerId },
      order: [["versionNo", "ASC"]],
    });

    return { offerBuyers, versions };
  }

  async findLastOfferByOwner(businessOwnerId) {
  return Offer.findOne({
    where: { businessOwnerId },
    order: [["id", "DESC"]],
    attributes: ["offerName"],
  });
  }

  async findLatestActiveNegotiationForBuyer({ buyerId, businessOwnerId }) {
  return Offer.findOne({
    where: {
      buyerId,
      businessOwnerId,
    },
    order: [["updatedAt", "DESC"]],
    attributes: ["id"],
  });
}

}


export default new OfferRepository();