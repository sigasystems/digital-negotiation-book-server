import { Op } from "sequelize";
import offerDraftRepository from "../repositories/offerDraft.repository.js";
import { OfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups, formatOfferDates } from "../utlis/dateFormatter.js";

export const offerDraftService = {
  // CREATE offer draft
  createOfferDraft: async (data) => {
    const parsed = OfferSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message);
      return { error: `Validation failed: ${errors.join(", ")}` };
    }

    const { sizeBreakups, total, grandTotal } = parsed.data;
    const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
    if (validationError) return { error: validationError };

    const draft = await offerDraftRepository.create(parsed.data);
    return { created: formatOfferDates(draft) };
  },

  // GET all offer drafts
  getAllOfferDrafts: async () => {
    const drafts = await offerDraftRepository.findAll();
    return { drafts: drafts.map(formatOfferDates) };
  },

  // GET offer draft by ID
  getOfferDraftById: async (id) => {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) return { error: "Offer draft not found" };
    return { draft: formatOfferDates(draft) };
  },

  // UPDATE offer draft
  updateOfferDraft: async (id, data) => {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) return { error: "Offer draft not found" };
    if (draft.isDeleted || draft.deletedAt) return { error: "Cannot update a deleted offer draft" };
    if (draft.status === "close") return { error: "Cannot update a closed offer draft" };

    const parsed = OfferSchema.partial().safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message);
      return { error: `Validation failed: ${errors.join(", ")}` };
    }

    const { sizeBreakups, total, grandTotal } = parsed.data;
    if (sizeBreakups && total && grandTotal) {
      const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
      if (validationError) return { error: validationError };
    }

    const updated = await offerDraftRepository.update(draft, parsed.data);
    return { updated };
  },

  // DELETE offer draft
  deleteOfferDraft: async (id) => {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) return { error: "Offer draft not found" };
    if (draft.isDeleted || draft.deletedAt) return { error: "Offer draft already deleted" };

    const deletedDraft = await offerDraftRepository.softDelete(draft);
    return {
      deleted: {
        draftNo: deletedDraft.draftNo,
        deletedAt: formatOfferDates(deletedDraft).deletedAt,
      },
    };
  },

  // UPDATE offer status
  updateOfferStatus: async (id, status) => {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) return { error: "Offer draft not found" };
    if (draft.isDeleted || draft.deletedAt)
      return { error: "Cannot update status: draft is deleted" };
    if (draft.status === status)
      return { error: `Offer draft status is already '${status}'` };

    const updatedDraft = await offerDraftRepository.update(draft, { status });
    return {
      updated: {
        draftNo: updatedDraft.draftNo,
        status: updatedDraft.status,
      },
    };
  },

  // SEARCH offer drafts
  searchOfferDrafts: async (query) => {
    const whereClause = {};
    if (query.draftNo) whereClause.draftNo = Number(query.draftNo);
    if (query.draftName) whereClause.draftName = { [Op.like]: `%${query.draftName}%` };
    if (query.status) whereClause.status = query.status;
    if (query.isDeleted !== undefined)
      whereClause.isDeleted = query.isDeleted === "true";

    const drafts = await offerDraftRepository.search(whereClause);
    return { drafts: drafts.map(formatOfferDates) };
  },
};;
