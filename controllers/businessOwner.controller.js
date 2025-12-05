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
    
    // Helper function to parse queries for Vercel
    const parseVercelQuery = (req) => {
      const result = {};
      
      console.log("=== PARSING QUERY FOR VERCEl ===");
      console.log("All query keys received:", Object.keys(req.query));
      console.log("Full req.query:", req.query);
      
      // FIRST: Check for direct parameters (status=active)
      // This should be the primary method
      if (req.query.status) {
        result.status = req.query.status;
        console.log(`Found status in req.query.status: ${result.status}`);
      }
      if (req.query.country) {
        result.country = req.query.country;
      }
      if (req.query.isVerified !== undefined) {
        result.isVerified = req.query.isVerified;
      }
      if (req.query.page !== undefined) {
        result.page = req.query.page;
      }
      if (req.query.limit !== undefined) {
        result.limit = req.query.limit;
      }
      
      // SECOND: Check for query[field]=value format (Vercel might store it differently)
      Object.keys(req.query).forEach(key => {
        // Handle query[status]=active format
        const match = key.match(/^query\[([^\]]+)\]$/);
        if (match) {
          const fieldName = match[1];
          result[fieldName] = req.query[key];
          console.log(`Found ${fieldName} = ${req.query[key]} in query[${fieldName}]`);
        }
        // Handle URL-encoded query%5Bstatus%5D=active
        const encodedMatch = key.match(/^query%5B([^%]+)%5D$/);
        if (encodedMatch) {
          const fieldName = encodedMatch[1];
          result[fieldName] = req.query[key];
          console.log(`Found ${fieldName} = ${req.query[key]} in query%5B${fieldName}%5D`);
        }
      });
      
      // THIRD: Check for nested query object (works locally)
      if (req.query.query) {
        console.log("req.query.query exists, type:", typeof req.query.query);
        if (typeof req.query.query === 'object') {
          // Merge object properties
          Object.assign(result, req.query.query);
          console.log("Merged from req.query.query object:", req.query.query);
        } else if (typeof req.query.query === 'string') {
          // Try to parse as JSON string
          try {
            const parsed = JSON.parse(req.query.query);
            Object.assign(result, parsed);
            console.log("Parsed JSON string from req.query.query:", parsed);
          } catch (e) {
            console.log("Could not parse req.query.query as JSON:", e.message);
          }
        }
      }
      
      console.log("Final parsed query object:", result);
      return result;
    };
    
    // Parse the query using our helper
    const queryObj = parseVercelQuery(req);
    
    // Extract values with defaults
    const country = queryObj.country || undefined;
    const status = queryObj.status; // Keep as is, don't default yet
    const isVerified = queryObj.isVerified !== undefined 
      ? queryObj.isVerified === "true" 
      : undefined;
    
    console.log("Extracted values:", { country, status, isVerified });
    
    // CRITICAL FIX: If status is null/undefined, provide default
    let finalStatus = status;
    if (!status) {
      console.log("WARNING: Status is null/undefined, defaulting to 'active'");
      finalStatus = 'active';
    }
    
    console.log("Status for validation:", finalStatus);
    
    const parsed = buyerSearchSchemaValidation
      .pick({ country: true, status: true, isVerified: true })
      .safeParse({ 
        country: country, 
        status: finalStatus, 
        isVerified: isVerified 
      });

    if (!parsed.success) {
      console.log("Validation failed:", parsed.error.errors);
      return errorResponse(
        res,
        400,
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    console.log("Validation passed, parsed data:", parsed.data);
    
    const page = Number(queryObj.page) || 0;
    const limit = Number(queryObj.limit) || 10;
    const ownerId = req.user.businessOwnerId;
    
    console.log("Calling service with:", {
      ownerId,
      query: parsed.data,
      pagination: { page, limit }
    });
    
    const { count, rows } = await buyerService.searchBuyers(
      ownerId,
      parsed.data,
      { page, limit }
    );
    
    return successResponse(res, 200, "Buyers filtered successfully", {
      buyers: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error("Error in searchBuyers:", err);
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
