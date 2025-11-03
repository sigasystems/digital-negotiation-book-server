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
 getAllOfferDrafts: async (businessOwnerId, { pageIndex, pageSize, offset }) => {
  if (!businessOwnerId) throw new Error("businessOwnerId is required");

  const { drafts, total } = await offerDraftRepository.findAll(businessOwnerId, {
    pageIndex,
    pageSize,
    offset,
  });

  return {
    drafts: drafts.map(formatOfferDates),
    totalItems: total,
  };
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

    // Merge with existing record for validation
    const finalOfferValidityDate =
      parsed.data.offerValidityDate ?? draft.offerValidityDate;
    const finalShipmentDate =
      parsed.data.shipmentDate ?? draft.shipmentDate;

    const toLocalDateOnly = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const today = toLocalDateOnly(new Date());
    const validityDay = finalOfferValidityDate
      ? toLocalDateOnly(finalOfferValidityDate)
      : null;
    const shipmentDay = finalShipmentDate
      ? toLocalDateOnly(finalShipmentDate)
      : null;

    // --- Validations ---
    if (validityDay && validityDay < today)
      return { error: "Offer validity date cannot be earlier than today." };

    if (shipmentDay && validityDay && shipmentDay < validityDay)
      return { error: "Shipment date cannot be earlier than the offer validity date." };

    if (shipmentDay && !validityDay && shipmentDay < today)
      return { error: "Shipment date cannot be earlier than today." };

    // --- Size breakup validation ---
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

    const deletedDraft = await offerDraftRepository.delete(id);
    return {
      deleted: {
        draftNo: deletedDraft.draftNo,
        deletedAt: deletedDraft.deletedAt,
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
searchOfferDrafts: async ({ filters, pageIndex, pageSize }) => {
    const whereClause = {};
    if (filters.draftNo) whereClause.draftNo = Number(filters.draftNo);
    if (filters.draftName) whereClause.draftName = { [Op.like]: `%${filters.draftName}%` };
    if (filters.status) whereClause.status = filters.status;
    if (filters.isDeleted !== undefined)
      whereClause.isDeleted = filters.isDeleted === "true";

  const offset = pageIndex * pageSize;
  const limit = pageSize;

  const { drafts, totalItems } = await offerDraftRepository.search({
    whereClause,
    offset,
    limit,
  });

  return {
    drafts: drafts.map(formatOfferDates),
    totalItems,
    pageIndex,
    pageSize,
  };
},
};
