
import z from "zod";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/authorizeRoles.js";
import { getPagination } from "../handlers/pagination.js";
import {locationService} from "../services/location.service.js";

// Create
export const createLocations = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const result = await locationService.createLocations(req.body);
  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);
  if (result.conflict) {
    return errorResponse(res, 409, `Locations with codes already exist: ${result.conflict.join(", ")}`);
  }
  return successResponse(res, 201, "Locations created successfully", result.created);
});

// Get All
export const getAllLocations = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const locations = await locationService.getAll();
  return successResponse(res, 200, "Locations retrieved successfully", locations);
});

// Get by ID
export const getLocationById = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const location = await locationService.getById(req.params.id);
  if (!location) return errorResponse(res, 404, "Location not found");
  return successResponse(res, 200, "Location retrieved successfully", location);
});

// Update
export const updateLocation = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const result = await locationService.update(req.params.id, req.body);

  if (!result) return errorResponse(res, 404, "Location not found");
  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);
  if (result.conflict) return errorResponse(res, 409, `Location with code '${result.conflict}' already exists`);

  return successResponse(res, 200, "Location updated successfully", result.updated);
});

// Delete
export const deleteLocation = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const deleted = await locationService.delete(req.params.id);

  if (!deleted) return errorResponse(res, 404, "Location not found");
  return successResponse(res, 200, "Location deleted successfully");
});

// Search with pagination
export const searchLocations = asyncHandler(async (req, res) => {
  const { query, country, code, portalCode } = req.query;
  const { limit, offset, page } = getPagination(req.query);

  const { count, rows } = await locationService.search({
    query,
    country,
    code,
    portalCode,
    limit,
    offset,
  });

  return successResponse(res, 200, "Locations fetched successfully", {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    locations: rows,
  });
});
