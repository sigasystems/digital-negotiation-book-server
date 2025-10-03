import offerDraftRepository from "../repositories/offerDraft.repository.js";
import { OfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups, formatOfferDates } from "../utlis/dateFormatter.js";

class OfferDraftService {
  async createOfferDraft(data) {
    const parsed = OfferSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message);
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    const { sizeBreakups, total, grandTotal } = parsed.data;
    const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
    if (validationError) throw new Error(validationError);

    const draft = await offerDraftRepository.create(parsed.data);
    return formatOfferDates(draft);
  }

  async getAllOfferDrafts() {
    const drafts = await offerDraftRepository.findAll();
    return drafts.map(formatOfferDates);
  }

  async getOfferDraftById(id) {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) throw new Error("Offer draft not found");
    return formatOfferDates(draft);
  }

  async updateOfferDraft(id, data) {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) throw new Error("Offer draft not found");
    if (draft.isDeleted || draft.deletedAt) throw new Error("Cannot update a deleted offer draft");
    if (draft.status === "close") throw new Error("Cannot update a closed offer draft");

    const parsed = OfferSchema.partial().safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message);
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }

    const { sizeBreakups, total, grandTotal } = parsed.data;
    if (sizeBreakups && total && grandTotal) {
      const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
      if (validationError) throw new Error(validationError);
    }

    return offerDraftRepository.update(draft, parsed.data);
  }

  async deleteOfferDraft(id) {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) throw new Error("Offer draft not found");
    if (draft.isDeleted || draft.deletedAt) throw new Error("Offer draft already deleted");

    const deletedDraft = await offerDraftRepository.softDelete(draft);
    return { draftNo: deletedDraft.draftNo, deletedAt: formatOfferDates(deletedDraft).deletedAt };
  }

  async updateOfferStatus(id, status) {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) throw new Error("Offer draft not found");
    if (draft.isDeleted || draft.deletedAt) throw new Error("Cannot update status: draft is deleted");
    if (draft.status === status) throw new Error(`Offer draft status is already '${status}'`);

    const updatedDraft = await offerDraftRepository.update(draft, { status });
    return { draftNo: updatedDraft.draftNo, status: updatedDraft.status };
  }

  async searchOfferDrafts(query) {
    const whereClause = {};
    if (query.draftNo) whereClause.draftNo = Number(query.draftNo);
    if (query.draftName) whereClause.draftName = { [Op.like]: `%${query.draftName}%` };
    if (query.status) whereClause.status = query.status;
    if (query.isDeleted !== undefined) whereClause.isDeleted = query.isDeleted === "true";

    const drafts = await offerDraftRepository.search(whereClause);
    return drafts.map(formatOfferDates);
  }
}

export default new OfferDraftService();
