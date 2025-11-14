import { Offer, OfferDraft, BusinessOwner, OfferDraftProduct, SizeBreakup, OfferProduct, OfferSizeBreakup, OfferBuyer } from "../models/index.js";

class OfferRepository {
  // Draft
  async findDraftById(draftId, transaction) {
    return OfferDraft.findOne({
      where: { draftNo: draftId },
      include: [
        {
          model: BusinessOwner,
          as: "businessOwner",
          attributes: ["id", "first_name", "last_name"],
        },
      ],
      transaction,
    });
  }

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
    async createOffer(data, offerName, user, transaction, buyerId) {
      const offer = await Offer.create({
        businessOwnerId: data.businessOwnerId,
        offerName,
        businessName: user.businessName,
        fromParty: user.businessName,
        toParty: data.toParty,
        buyerId: buyerId || null,
        origin: data.origin,
        processor: data.processor,
        plantApprovalNumber: data.plantApprovalNumber,
        brand: data.brand,
        draftName: data.draftName,
        offerValidityDate: data.offerValidityDate,
        shipmentDate: data.shipmentDate,
        grandTotal: Number(data.grandTotal) || 0,
        quantity: Number(data.quantity) || 0,
        tolerance: data.tolerance,
        paymentTerms: data.paymentTerms,
        remark: data.remark,
        packing: data.packing,
        status: "open",
      }, { transaction });

      for (const p of data.products || []) {
        const offerProduct = await OfferProduct.create({
          offerId: offer.id,
          productId: p.productId,
          productName: p.productName || "",
          species: p.species || "",
          packing: p.packing || "",
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
    return Offer.findAndCountAll({
      where: filters,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
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
}

export default new OfferRepository();