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
    // read and normalize inputs
    const rawEmail = req.query.email;
    const rawBusinessName = req.query.businessName;
    const rawRegistrationNumber = req.query.registrationNumber;

    const email = rawEmail?.trim();
    const businessName = rawBusinessName?.trim();
    const registrationNumber = rawRegistrationNumber?.trim();

    // require at least one field
    if (!email && !businessName && !registrationNumber) {
      return errorResponse(
        res,
        400,
        "At least one field (email, businessName, or registrationNumber) is required"
      );
    }

    // build conditions (case-insensitive match for businessName optional)
    const conditions = [];
    if (email) conditions.push({ email });
    if (businessName) conditions.push({ businessName }); // DB should handle case rules; see note
    if (registrationNumber) conditions.push({ registrationNumber });

    // find any existing owner matching any condition
    const existing = await BusinessOwner.findOne({ $or: conditions }).select(
      "email businessName registrationNumber"
    );

    // if nothing found -> unique
    if (!existing) {
      return successResponse(res, 200, "All fields are unique", {
        exists: false,
        conflicts: {},
      });
    }

    // build conflicts and messages
    const conflicts = {};
    const messageParts = [];

    if (email && existing.email === email) {
      conflicts.email = true;
      messageParts.push("Email is already registered");
    }

    // If your DB is case-sensitive for businessName, you may want to compare lowercased versions:
    // if (businessName && existing.businessName?.toLowerCase() === businessName.toLowerCase()) { ... }
    if (businessName && existing.businessName === businessName) {
      conflicts.businessName = true;
      messageParts.push("Business name already exists");
    }

    if (
      registrationNumber &&
      existing.registrationNumber === registrationNumber
    ) {
      conflicts.registrationNumber = true;
      messageParts.push("Registration number already exists");
    }

    // Return 409 Conflict with details
    return errorResponse(
      res,
      409,
      messageParts.length ? messageParts.join(", ") : "Some fields already exist",
      {
        exists: true,
        conflicts,
      }
    );
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
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
