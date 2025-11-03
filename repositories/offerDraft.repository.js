import { OfferDraft, BusinessOwner } from "../models/index.js";

class OfferDraftRepository {
  async create(data) {
    return OfferDraft.create(data);
  }

  async findAll(businessOwnerId, { pageIndex, pageSize, offset }) {
    const { rows: drafts, count: total } = await OfferDraft.findAndCountAll({
      where: { businessOwnerId },
      limit: pageSize,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return { drafts, total };
  }

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

  async update(draft, data) {
    await draft.update(data);
    await draft.reload({ paranoid: false });
    return draft;
  }

  async delete(draftId) {
    const draft = await OfferDraft.findOne({ where: { draftNo: draftId } });

    if (!draft) {
      console.error("Offer draft not found with draftNo:", draftId);
      throw new Error("Offer draft not found");
    }

    await draft.destroy({ force: true });
    return { draftNo: draft.draftNo, deletedAt: new Date() };
  }

    async search({ whereClause, offset = 0, limit = 10 }) {

    const rows = await OfferDraft.findAll({
      where: whereClause,
      offset,
      limit,
      paranoid: false,
      order: [["createdAt", "DESC"]],
    });

    const count = await OfferDraft.count({
      where: whereClause,
      paranoid: false,
    });

    return {
      drafts: rows,
      totalItems: count,
    };
  }
}

export default new OfferDraftRepository();
