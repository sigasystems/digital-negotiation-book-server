import {
  buyerSchema,
  buyerSchemaValidation,
  buyerSearchSchemaValidation,
} from "../validations/buyer.validation.js";
import { businessOwnerSchema } from "../validations/business.validation.js";
import { buyerService } from "../services/buyer.service.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { checkAccountStatus } from "../utlis/helper.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import { normalizeKeysToCamelCase } from "../utlis/normalizeKeys.js";
import buyersRepository from "../repositories/buyers.repository.js";

// Become Business Owner
export const becomeBusinessOwner = asyncHandler(async (req, res) => {
  try {
    const { email, planId, paymentId, billingCycle, businessName } = req.body;

    // Validate billingCycle
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return errorResponse(
        res,
        400,
        "Invalid billingCycle. Must be 'monthly' or 'yearly'."
      );
    }

    // Check user exists
    const existingUser = await buyersRepository.findUserByEmail(email);
    if (!existingUser) {
      return errorResponse(res, 404, "User not found in the system");
    }
    // Check plan exists
    const plan = await PlanRepository.findById(planId);
    if (!plan) {
      return errorResponse(res, 404, "Plan not found in the system");
    }
    // Validate business owner schema
    const parsed = businessOwnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existingBusinessOwner =
      await buyersRepository.findBusinessOwnerByUserId(existingUser.id);
    if (!existingBusinessOwner) {
      // Only now check if business name is already taken
      const existingBusiness = await buyersRepository.findBusinessOwnerByName(
        businessName
      );
      if (existingBusiness) {
        return errorResponse(
          res,
          400,
          `Business name '${businessName}' is already taken.`
        );
      }
    }

    // Calculate price based on billing cycle
    const planPrice =
      billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

    const { newOwner, accessToken, payment } =
      await buyerService.becomeBusinessOwner(
        email,
        {
          ...parsed.data,
          planId: plan.id,
          planName: plan.name,
          paymentId,
          billingCycle,
          res,
          maxLocations: plan.maxLocations || 5,
          maxProducts: plan.maxProducts || 100,
          maxOffers: plan.maxOffers || 50,
          maxBuyers: plan.maxBuyers || 100,
        },
        existingUser
      );

    return successResponse(res, 201, "Business owner created successfully!", {
      accessToken,
      businessOwnerId: newOwner.id,
      first_name: newOwner.first_name,
      last_name: newOwner.last_name,
      email: newOwner.email,
      plan: {
        id: plan.id,
        name: plan.name,
        billingCycle,
        price: planPrice,
      },
      businessName: newOwner.businessName,
      paymentId: paymentId || payment?.id || null,
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

    const buyersPaginated = await buyerService.getAllBuyers(
      req.user.businessOwnerId,
      {
        pageIndex,
        pageSize,
      }
    );

    return successResponse(
      res,
      200,
      "Buyers fetched successfully",
      buyersPaginated
    );
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

export const getBuyersList = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const buyers = await buyerService.getBuyersList(req.user.businessOwnerId);

    return successResponse(res, 200, "Buyers list fetched successfully", buyers);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
  }
});

// Get buyer by ID
export const getBuyerById = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const buyer = await buyerService.getBuyerById(
      req.user.businessOwnerId,
      req.params.id
    );
    return successResponse(res, 200, "Buyer fetched successfully", buyer);
  } catch (err) {
    return errorResponse(res, 500, err.message || "Failed to fetch buyer");
  }
});

// Search buyers
export const searchBuyers = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    console.log("Environment:", process.env.NODE_ENV);
    console.log("Full req.query:", JSON.stringify(req.query, null, 2));
    console.log("req.query type:", typeof req.query);
    console.log("req.query.query:", req.query.query);
    console.log("req.query.query type:", typeof req.query.query);
    
    // Use WHATWG URL API (available in modern Node.js)
    console.log("Original URL:", req.originalUrl);
    
    // Parse URL using WHATWG URL - works in both browser and Node.js
    let parsedUrl;
    try {
      // Create a dummy base URL since we only have the path
      const baseUrl = `http://${req.headers.host || 'localhost'}`;
      parsedUrl = new URL(req.originalUrl, baseUrl);
      console.log("Parsed URL search params:", parsedUrl.searchParams.toString());
      
      // Get individual parameters
      console.log("URLSearchParams entries:");
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        console.log(`  ${key} = ${value}`);
      }
    } catch (error) {
      console.log("URL parsing error:", error.message);
    }
    
    const queryObj = req.query.query || {};
    
    // DEBUG: Check how queryObj is structured
    console.log("queryObj:", queryObj);
    console.log("queryObj.status:", queryObj.status);
    console.log("queryObj.status type:", typeof queryObj.status);
    
    // Check if it's a string that needs parsing
    if (typeof queryObj === 'string') {
      console.log("queryObj is a string, attempting to parse as JSON");
      try {
        const parsed = JSON.parse(queryObj);
        console.log("Parsed queryObj:", parsed);
      } catch (e) {
        console.log("Failed to parse as JSON:", e.message);
      }
    }
    
    // Alternative: Try to extract from URL directly
    let statusFromUrl = null;
    if (parsedUrl) {
      // Check for query[status] or query%5Bstatus%5D
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        if (key === 'query[status]' || key.includes('status')) {
          statusFromUrl = value;
          break;
        }
      }
      console.log("Status from URL search params:", statusFromUrl);
    }
    
    // Use the status from URL if queryObj doesn't have it
    const country = queryObj.country;
    const status = queryObj.status || statusFromUrl;
    const isVerified =
      queryObj.isVerified !== undefined
        ? queryObj.isVerified === "true"
        : undefined;

    console.log("Final parsed values:");
    console.log("- country:", country);
    console.log("- status:", status);
    console.log("- isVerified:", isVerified);
    const parsed = buyerSearchSchemaValidation
      .pick({ country: true, status: true, isVerified: true })
      .safeParse({ country, status, isVerified });

    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const page = Number(queryObj.page) || 0;
    const limit = Number(queryObj.limit) || 10;
    const ownerId = req.user.businessOwnerId;

    const { count, rows } = await buyerService.searchBuyers(
      ownerId,
      parsed.data,
      { page, limit }
    );
    console.log("rpws",rows)
    return successResponse(res, 200, "Buyers filtered successfully", {
      buyers: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    });
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

    const owner = await buyersRepository.findOwnerById(
      req.user.businessOwnerId
    );
    checkAccountStatus(owner, "Business owner");

    const newBuyer = await buyerService.addBuyer(
      req.user.businessOwnerId,
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

    const normalizedBody = normalizeKeysToCamelCase(req.body);

    const parsed = buyerSchemaValidation.safeParse(normalizedBody);

    if (!parsed.success) {
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const buyer = await buyersRepository.findById(req.params.id);
    checkAccountStatus(buyer, "Buyer");

    const owner = await buyersRepository.findOwnerById(buyer.ownerId);
    const updated = await buyerService.editBuyer(buyer, parsed.data, owner);

    return successResponse(res, 200, "Buyer updated successfully", updated);
  } catch (err) {
    if (
      err.message.includes("already in use") ||
      err.message.includes("Invalid") ||
      err.message.includes("not found")
    ) {
      return errorResponse(res, 400, err.message);
    }

    console.error("Edit buyer failed:", err);
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
    const exists = await buyerService.checkRegistrationNumber(
      registrationNumber
    );
    return successResponse(res, 200, "Check completed", { exists });
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, err.message || "Server error");
  }
});
