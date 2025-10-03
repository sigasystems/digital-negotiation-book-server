import {Offer} from "../models/index.js"
  
class OfferRepository {
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