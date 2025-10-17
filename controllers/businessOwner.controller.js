import { buyerSchema } from "../validations/buyer.validation.js";
import { businessOwnerSchema } from "../validations/business.validation.js";
import {buyerService} from "../services/buyer.service.js";
import buyersRepository from "../repositories/buyers.repository.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { checkAccountStatus } from "../utlis/helper.js";
import { asyncHandler } from "../handlers/asyncHandler.js";

// Become Business Owner
export const becomeBusinessOwner = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await buyersRepository.findUserByEmail(email);
    if (!existingUser)
      return errorResponse(res, 404, "User not found in the system");

    const parsed = businessOwnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { newOwner, accessToken } = await buyerService.becomeBusinessOwner(
      email,
      { ...parsed.data, res },
      existingUser
    );
    return successResponse(res, 201, "Business owner created successfully!", {
      accessToken,
      id: newOwner.id,
      first_name: newOwner.first_name,
      last_name: newOwner.last_name,
      email: newOwner.email,
      businessName: newOwner.businessName,
      registrationNumber: newOwner.registrationNumber,
      status: newOwner.status,
      createdAt: newOwner.createdAt,
    });
  } catch (err) {
    return errorResponse(
      res,
      500,
      err.message || "Failed to create business owner"
    );
  }
});

// Get all buyers
export const getAllBuyers = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const pageIndex = parseInt(req.query.pageIndex) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const buyersPaginated = await buyerService.getAllBuyers(req.user.businessOwnerId,
 {
      pageIndex,
      pageSize,
    });

    return successResponse(res, 200, "Buyers fetched successfully", buyersPaginated
    );
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Get buyer by ID
export const getBuyerById = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    console.log("controller",req.user, req.params.id)
    const buyer = await buyerService.getBuyerById(req.user.businessOwnerId, req.params.id);
    return successResponse(res, 200, "Buyer fetched successfully", buyer);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to fetch buyer");
  }
});

// Search buyers
export const searchBuyers = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const { country, status, isVerified } = req.query;
    const parsed = buyerSearchSchemaValidation
      .pick({ country: true, status: true, isVerified: true })
      .safeParse({
        country,
        status,
        isVerified: isVerified ? isVerified === "true" : undefined,
      });

    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const buyers = await buyerService.searchBuyers(req.user.id, parsed.data);
    return successResponse(
      res,
      200,
      buyers.length ? "Buyers filtered successfully" : "No buyers found",
      buyers
    );
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to search buyers");
  }
});

// Add Buyer
export const addBuyer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const parsed = buyerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const owner = await buyersRepository.findOwnerById(req.user.id);
    checkAccountStatus(owner, "Business owner");

    const newBuyer = await buyerService.addBuyer(
      req.user.id,
      parsed.data,
      owner
    );
    return successResponse(res, 201, "Buyer added successfully", newBuyer);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to add buyer");
  }
});

// Delete Buyer
export const deleteBuyer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const buyer = await buyersRepository.findById(req.params.id);
    checkAccountStatus(buyer, "Buyer");

    const owner = await buyersRepository.findOwnerById(buyer.ownerId);
    await buyerService.deleteBuyer(buyer, owner);

    return successResponse(res, 200, "Buyer deleted successfully");
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to delete buyer");
  }
});

// Activate Buyer
export const activateBuyer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const buyer = await buyersRepository.findById(req.params.id);
    checkAccountStatus(buyer, "Buyer");

    const owner = await buyersRepository.findOwnerById(buyer.ownerId);
    const updated = await buyerService.activateBuyer(buyer, owner);

    return successResponse(res, 200, "Buyer activated successfully", updated);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to activate buyer");
  }
});

// Deactivate Buyer
export const deactivateBuyer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const buyer = await buyersRepository.findById(req.params.id);
    checkAccountStatus(buyer, "Buyer");
    const owner = await buyersRepository.findOwnerById(buyer.ownerId);
    const updated = await buyerService.deactivateBuyer(buyer, owner);

    return successResponse(res, 200, "Buyer deactivated successfully", updated);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to deactivate buyer");
  }
});

// Edit Buyer
export const editBuyer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const parsed = buyerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(res,400,parsed.error.issues.map((i) => i.message).join(", ") );
    }

    const buyer = await buyersRepository.findById(req.params.id);
    checkAccountStatus(buyer, "Buyer");

    const owner = await buyersRepository.findOwnerById(buyer.ownerId);
    const updated = await buyerService.editBuyer(buyer, parsed.data, owner);

    return successResponse(res, 200, "Buyer updated successfully", updated);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to edit buyer");
  }
});

// Check registration number uniqueness
export const checkRegistrationNumber = asyncHandler(async (req, res) => {
  const { registrationNumber } = req.params;

  if (!registrationNumber) {
    return errorResponse(res, 400, "Registration number is required");
  }

  try {
    const exists = await buyerService.checkRegistrationNumber(registrationNumber);
    return successResponse(res, 200, "Check completed", { exists });
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, err.message || "Server error");
  }
});