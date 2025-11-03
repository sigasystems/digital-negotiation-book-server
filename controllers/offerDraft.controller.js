import { asyncHandler } from "../handlers/asyncHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import {offerDraftService} from "../services/offerDraft.service.js";

export const createOfferDraft = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const draft = await offerDraftService.createOfferDraft(req.body);
    return successResponse(res, 201, "Offer draft created successfully", draft);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getAllOfferDrafts = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const businessOwnerId = req.user?.businessOwnerId;
    if (!businessOwnerId) throw new Error("businessOwnerId is required");

    const pageIndex = parseInt(req.query.pageIndex) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = pageIndex * pageSize;

    const { drafts, totalItems } = await offerDraftService.getAllOfferDrafts(businessOwnerId, {
      pageIndex,
      pageSize,
      offset,
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    return successResponse(res, 200, "Offer drafts fetched successfully", {
      totalItems,
      totalPages,
      pageIndex,
      pageSize,
      drafts,
    });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getOfferDraftById = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const draft = await offerDraftService.getOfferDraftById(req.params.id);
    return successResponse(res, 200, "Offer draft fetched successfully", draft);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const updateOfferDraft = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const draft = await offerDraftService.updateOfferDraft(req.params.id, req.body);
    return successResponse(res, 200, "Offer draft updated successfully", draft);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const deleteOfferDraft = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const deleted = await offerDraftService.deleteOfferDraft(req.params.id);
    return successResponse(res, 200, "Offer draft deleted successfully", deleted);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const updateOfferStatus = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const { status } = req.body;
    const updated = await offerDraftService.updateOfferStatus(req.params.id, status);
    return successResponse(res, 200, "Offer draft status updated successfully", updated);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const searchOfferDrafts = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const drafts = await offerDraftService.searchOfferDrafts(req.query);
    return successResponse(res, 200, "Offer drafts fetched successfully", drafts);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});
