import { Offer, OfferDraft, BusinessOwner } from "../models/index.js";

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

  // Offer CRUD
  async createOffer(data, transaction) {
    return Offer.create(data, { transaction });
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
}

export default new OfferRepository();