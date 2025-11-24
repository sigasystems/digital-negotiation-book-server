// controllers/businessOwnerController.js
import { asyncHandler } from "../handlers/asyncHandler.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import buyersRepository from "../repositories/buyers.repository.js";
import userRepository from "../repositories/user.repository.js";
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
    const pageIndex = parseInt(req.query.pageIndex) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const ownersPaginated = await superAdminService.getAllBusinessOwners({
      withBuyers,
      pageIndex,
      pageSize,
    });

    return successResponse(res, 200, "Business owners fetched successfully", ownersPaginated);
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
    return successResponse(res, 200, "Business owner deleted successfully", owner);
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

export const searchBusinessOwners = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);

    const first_name =
      req.query.first_name || req.query["params[first_name]"];
    const last_name =
      req.query.last_name || req.query["params[last_name]"];
    const email =
      req.query.email || req.query["params[email]"];
    const businessName =
      req.query.businessName || req.query["params[businessName]"];
    const phoneNumber =
      req.query.phoneNumber || req.query["params[phoneNumber]"];
    const postalCode =
      req.query.postalCode || req.query["params[postalCode]"];
    const status =
      req.query.status || req.query["params[status]"];

    const page =
      Number(req.query.page || req.query["params[page]"] || 0);
    const limit =
      Number(req.query.limit || req.query["params[limit]"] || 10);

    const filters = {
      first_name,
      last_name,
      email,
      businessName,
      phoneNumber,
      postalCode,
      status,
    };

    const offset = page * limit;

    const result = await superAdminService.searchBusinessOwners(filters, {
      limit,
      offset,
    });

    return successResponse(res, 200, "Business owners fetched successfully", {
      businessOwners: result.businessOwners,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (err) {
    console.error("searchBusinessOwners Error:", err);
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

export const checkBusinessOwnerUnique = asyncHandler(async (req, res) => {
  try {
    // Log raw incoming query for debugging

    // Handle all possible formats of query parameters
    const email =
      req.query.email ||
      req.query.params?.email ||
      req.query["params[email]"] ||
      null;
    const businessName =
      req.query.businessName ||
      req.query.params?.businessName ||
      req.query["params[businessName]"] ||
      null;

    const registrationNumber =
      req.query.registrationNumber ||
      req.query.params?.registrationNumber ||
      req.query["params[registrationNumber]"] ||
      null;

    // Log extracted values
   

    const results = {};

    // -------------------------
    // Check Email
    // -------------------------
    if (email) {
      const existingEmail = await userRepository.findByEmail(email);

      results.email = {
        exists: !!existingEmail,
        field: "email",
        value: email,
        message: existingEmail
          ? "Email already registered. Please use another email."
          : "Email is available.",
      };
    }

    // -------------------------
    // Check Business Name
    // -------------------------
    if (businessName) {
      const existing = await buyersRepository.findBusinessName(businessName);

      results.businessName = {
        exists: !!existing,
        field: "businessName",
        value: businessName,
        message: existing
          ? "Business name already exists. Please choose another."
          : "Business name is available.",
      };
    }

    // -------------------------
    // Check Registration Number
    // -------------------------
    if (registrationNumber) {
      const existing = await buyersRepository.findRegistrationNumber(
        registrationNumber
      );

      results.registrationNumber = {
        exists: !!existing,
        field: "registrationNumber",
        value: registrationNumber,
        message: existing
          ? "Registration number already exists. Please use another."
          : "Registration number is available.",
      };
    } 

    console.log("Validation Results:", results);

    return successResponse(res, 200, "Validation completed", results);
  } catch (error) {
    console.error("Unique check error:", error);
    return errorResponse(res, 500, "Internal server error");
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
  searchBusinessOwners,
  checkBusinessOwnerUnique
};
