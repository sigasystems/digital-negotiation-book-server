// controllers/businessOwnerController.js
import { asyncHandler } from "../handlers/asyncHandler.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { superAdminService } from "../services/superadmin.service.js";
import { authorizeRoles } from "../utlis/helper.js";

// ------------------ SUPER ADMIN CONTROLLERS ------------------

// Create a new Business Owner
export const createBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.createBusinessOwner(req.body);
    return successResponse(res, 201, "Business owner created successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message, err.details || null);
  }
});

// Get all Business Owners (with optional buyers)
export const getAllBusinessOwners = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const withBuyers = req.query.withBuyers === "true";
    const owners = await superAdminService.getAllBusinessOwners(withBuyers);
    return successResponse(res, 200, "Business owners fetched successfully", { totalOwners: owners.length, owners });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Get Business Owner by ID
export const getBusinessOwnerById = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.getBusinessOwnerById(req.params.id);
    return successResponse(res, 200, "Business owner fetched successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Update Business Owner
export const updateBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.updateBusinessOwner(req.params.id, req.body);
    return successResponse(res, 200, "Business owner updated successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message, err.details || null);
  }
});

// Activate Business Owner
export const activateBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.activateBusinessOwner(req.params.id);
    return successResponse(res, 200, "Business owner activated successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Deactivate Business Owner
export const deactivateBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.deactivateBusinessOwner(req.params.id);
    return successResponse(res, 200, "Business owner deactivated successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Soft Delete Business Owner
export const softDeleteBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const owner = await superAdminService.softDeleteBusinessOwner(req.params.id);
    return successResponse(res, 200, "Business owner soft-deleted successfully", owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Review Business Owner (Approve or Reject)
export const reviewBusinessOwner = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const { action } = req.query; // ?action=approve or ?action=reject
    if (!["approve", "reject"].includes(action)) {
      return errorResponse(res, 400, "Invalid action. Use 'approve' or 'reject'.");
    }
    const owner = await superAdminService.reviewBusinessOwner(req.params.id, action);
    const message = action === "approve" ? "Business owner approved successfully" : "Business owner rejected successfully";
    return successResponse(res, 200, message, owner);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

export default {
  createBusinessOwner,
  getAllBusinessOwners,
  getBusinessOwnerById,
  updateBusinessOwner,
  activateBusinessOwner,
  deactivateBusinessOwner,
  softDeleteBusinessOwner,
  reviewBusinessOwner,
};
