import { Op } from "sequelize";
import {offerDraftRepository} from "../repositories/offerDraft.repository.js";
import { OfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups, formatOfferDates } from "../utlis/dateFormatter.js";
import Product from "../models/product.model.js";

export const offerDraftService = {
  createOfferDraft: async (data) => {

    const parsed = OfferSchema.safeParse(data);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      return { error: `Validation failed: ${errors.join(", ")}` };
    }

  const { products, grandTotal, draftName } = parsed.data;

  const draftData = {
    businessOwnerId: parsed.data.businessOwnerId,
    fromParty: parsed.data.fromParty,
    origin: parsed.data.origin,
    processor: parsed.data.processor,
    plantApprovalNumber: parsed.data.plantApprovalNumber,
    brand: parsed.data.brand,
    draftName: draftName,
    offerValidityDate: parsed.data.offerValidityDate,
    shipmentDate: parsed.data.shipmentDate,
    packing: parsed.data.packing,
    quantity: parsed.data.quantity,
    tolerance: parsed.data.tolerance,
    paymentTerms: parsed.data.paymentTerms,
    remark: parsed.data.remark,
    grandTotal: grandTotal,
    status: parsed.data.status || "open",
    isDeleted: false,
  };
  if (draftName) {
    const normalizedDraftName = draftName.trim();
    const existingDraft = await offerDraftRepository.findByName(normalizedDraftName);
    if (existingDraft) {
      return { error: `A draft with the name "${normalizedDraftName}" already exists.` };
    }
    }

    const validationError = validateSizeBreakups(products, grandTotal);
    if (validationError) return { error: validationError };

    const draft = await offerDraftRepository.createWithProducts(draftData, products);

    return { created: formatOfferDates(draft) };
},

  getOfferDraftById: async (id) => {
    const draft = await offerDraftRepository.findDraftById(id);
    if (!draft) return { error: "Offer draft not found" };
    return { draft: formatOfferDates(draft) };
  },

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

      const finalOfferValidityDate = parsed.data.offerValidityDate ?? draft.offerValidityDate;
    const finalShipmentDate = parsed.data.shipmentDate ?? draft.shipmentDate;

    const toLocalDateOnly = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const today = toLocalDateOnly(new Date());
    const validityDay = finalOfferValidityDate ? toLocalDateOnly(finalOfferValidityDate) : null;
    const shipmentDay = finalShipmentDate ? toLocalDateOnly(finalShipmentDate) : null;

    if (validityDay && validityDay < today)
      return { error: "Offer validity date cannot be earlier than today." };

    if (shipmentDay && validityDay && shipmentDay < validityDay)
      return { error: "Shipment date cannot be earlier than the offer validity date." };

    if (shipmentDay && !validityDay && shipmentDay < today)
      return { error: "Shipment date cannot be earlier than today." };

    if (sizeBreakups && total && grandTotal) {
      const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
      if (validationError) return { error: validationError };
    }

    const updated = await offerDraftRepository.update(draft, parsed.data);
    return { updated };
  },

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

searchOfferDrafts: async (ownerId, filters, pagination) => {
    const { count, rows } = await offerDraftRepository.search(
      ownerId,
      filters,
      pagination
    );

  return {
    drafts: rows.map(formatOfferDates),
    totalItems: count,
    pageIndex: pagination.page,
    pageSize: pagination.limit,
  };
},

  getLatestDraftNo: async () => {
    const lastDraft = await offerDraftRepository.getLatestDraftNo();
    return lastDraft;
},
};
