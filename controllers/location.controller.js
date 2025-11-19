import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { getPagination } from "../handlers/pagination.js";
import { locationService } from "../services/location.service.js";

export const createLocations = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.id;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");
  const result = await locationService.createLocations(req.body, ownerId);
  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);
  if (result.conflict) {
    return errorResponse(res, 409, `Locations with codes already exist: ${result.conflict.join(", ")}`);
  }
  return successResponse(res, 201, "Locations created successfully", result.created);
});

// GET ALL
export const getAllLocations = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.businessOwnerId;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");
  const locations = await locationService.getAll(ownerId);
  return successResponse(res, 200, "Locations retrieved successfully", { total: locations.length, locations });
});

// GET BY ID
export const getLocationById = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.id;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");
  const location = await locationService.getById(req.params.id, ownerId);
  if (!location) return errorResponse(res, 404, "Location not found");
  return successResponse(res, 200, "Location retrieved successfully", location);
});

// UPDATE
export const updateLocation = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.id;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");
  const result = await locationService.update(req.params.id, req.body, ownerId);
  if (result === null) return errorResponse(res, 404, "Location not found");
  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);
  if (result.conflict) return errorResponse(res, 409, `Location with code '${result.conflict}' already exists`);

  return successResponse(res, 200, "Location updated successfully", result.updated);
});

// DELETE
export const deleteLocation = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.id;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");
  const deleted = await locationService.delete(req.params.id, ownerId);
  if (!deleted) return errorResponse(res, 404, "Location not found");
  return successResponse(res, 200, "Location deleted successfully");
});

// SEARCH with pagination
export const searchLocations = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.id;
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");

  const { query, city, state, code, countryName } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  const { count, rows } = await locationService.search({
    query,
    city,
    state,
    codecountryId,
    countryName,
    limit,
    offset,
    ownerId,
  });

  return successResponse(res, 200, "Locations fetched successfully", {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    locations: rows,
  });
});
