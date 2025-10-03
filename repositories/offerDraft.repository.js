import { OfferDraft, BusinessOwner } from "../models/index.js";

class OfferDraftRepository {
  async create(data) {
    return OfferDraft.create(data);
  }

  async findAll(includeDeleted = false) {
    return OfferDraft.findAll({ paranoid: !includeDeleted });
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

  async softDelete(draft) {
    await draft.update({ isDeleted: true, deletedAt: new Date() });
    await draft.reload({ paranoid: false });
    return draft;
  }

  async search(filters) {
    return OfferDraft.findAll({ where: filters, paranoid: false });
  }
}

export default new OfferDraftRepository();
