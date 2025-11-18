import { asyncHandler } from "../handlers/asyncHandler.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import * as countryService from "../services/country.service.js";

export const createCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const result = await countryService.createWithCountry(req.body, req.user);

  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);

  return successResponse(res, 201, "Location created successfully", result.data);
});

export const getCountries = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerId = req.user?.businessOwnerId; 
  if (!ownerId) return errorResponse(res, 401, "Unauthorized: ownerId missing");

  const pageIndex = parseInt(req.query.pageIndex) || 0;
  const pageSize = parseInt(req.query.pageSize) || 10;

  const data = await countryService.getCountries(ownerId, { pageIndex, pageSize });
  return successResponse(res, 200, "Locations fetched", data);
});

export const getAllCountries = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const countries = await countryService.getAllCountries();

  return successResponse(res, 200, "Countries fetched successfully", countries);
});

export const getCountryById = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const id = req.params.id;
  const result = await countryService.getCountryById(id, req.user);

  if (result.notFound)
    return errorResponse(res, 404, "Location not found");

  if (result.unauthorized)
    return errorResponse(res, 403, "You are not authorized to access this location");

  return successResponse(res, 200, "Location fetched successfully", result);
});

export const searchCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const { code, country } = req.query.query || {};

  if (!code && !country) {
    return errorResponse(res, 400, "At least one search parameter (code or country) is required");
  }

  const result = await countryService.searchCountry({ code, country }, req.user);

  const dataArray = result ? [result] : [];

  return successResponse(res, 200, "Search completed", {
    data: dataArray,
    totalItems: dataArray.length,
    totalPages: 1,
    pageIndex: 0,
    pageSize: dataArray.length,
    totalActive: dataArray.length,
    totalInactive: 0,
    totalDeleted: 0
  });
});

export const updateCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const ownerId = req.user?.businessOwnerId;
  const result = await countryService.updateCountry(req.params.id, req.body, ownerId);

  if (result.notFound) return errorResponse(res, 404, "Location not found");
  if (result.unauthorized) return errorResponse(res, 403, "Forbidden");
  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);

  return successResponse(res, 200, "Location updated successfully", result.updated);
});

export const deleteCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerid = req.user?.businessOwnerId;

  const result = await countryService.deleteCountry(req.params.id, ownerid);

  if (result.notFound) return errorResponse(res, 404, "Country not found");
  if (result.unauthorized) return errorResponse(res, 403, "Forbidden");

  return successResponse(res, 200, "Country deleted successfully");
});
