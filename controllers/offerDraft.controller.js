import { asyncHandler } from "../handlers/asyncHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import {offerDraftService} from "../services/offerDraft.service.js";

export const createOfferDraft = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const result = await offerDraftService.createOfferDraft(req.body);
    
    if (result.error) {
      return errorResponse(res, 400, result.error);
    }
    
    return successResponse(res, 201, "Offer draft created successfully", result.created);
  } catch (err) {
    console.error("Create draft error:", err);
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
    const draftId = parseInt(req.params.id, 10);
    const deleted = await offerDraftService.deleteOfferDraft(draftId);
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

    const ownerId = req.user.businessOwnerId;

    const { pageIndex = 0, pageSize = 10, ...filters } = req.query;

    const result = await offerDraftService.searchOfferDrafts(
      ownerId,
      {
        draftNo: filters.draftNo,
        draftName: filters.draftName,
        status: filters.status,
        productName: filters.productName,
      },
      {
        page: Number(pageIndex),
        limit: Number(pageSize),
      }
    );

    return successResponse(res, 200, "Offer drafts fetched successfully", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const fetchLatestDraftNo = async (req, res) => {
  try {
    const lastDraftNo = await offerDraftService.getLatestDraftNo();
    res.json({ lastDraftNo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch last draft number" });
  }
};
