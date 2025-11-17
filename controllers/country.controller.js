import { asyncHandler } from "../handlers/asyncHandler.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import * as countryService from "../services/country.service.js";

export const createCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const result = await countryService.createCountry(req.body, req.user);

  if (result.error) return errorResponse(res, 400, "Validation failed", result.error);
  if (result.conflict)
    return errorResponse(res, 409, "Country already exists with code/country", result.conflict);

  return successResponse(res, 201, "Country created successfully", result.created);
});

export const getCountries = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerid = req.user?.businessOwnerId;

  const pageIndex = parseInt(req.query.pageIndex) || 0;
  const pageSize = parseInt(req.query.pageSize) || 10;

  const data = await countryService.getCountries(ownerid, {
    pageIndex,
    pageSize,
  });

  return successResponse(res, 200, "Countries fetched", data);
});

export const getCountryById = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);

  const id = req.params.id;

  const result = await countryService.getCountryById(id, req.user);

  if (result.notFound)
    return errorResponse(res, 404, "Country not found");

  if (result.forbidden)
    return errorResponse(res, 403, "You are not authorized to access this country");

  return successResponse(res, 200, "Country fetched successfully", result.country);
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
  const ownerid = req.user?.businessOwnerId;

  const result = await countryService.updateCountry(req.params.id, req.body, ownerid);

  if (result.notFound) return errorResponse(res, 404, "Country not found");
  if (result.unauthorized) return errorResponse(res, 403, "Forbidden");
  if (result.conflict) return errorResponse(res, 409, "Code or country already exists");

  return successResponse(res, 200, "Country updated successfully", result.updated);
});

export const deleteCountry = asyncHandler(async (req, res) => {
  authorizeRoles(req, ["business_owner"]);
  const ownerid = req.user?.businessOwnerId;

  const result = await countryService.deleteCountry(req.params.id, ownerid);

  if (result.notFound) return errorResponse(res, 404, "Country not found");
  if (result.unauthorized) return errorResponse(res, 403, "Forbidden");

  return successResponse(res, 200, "Country deleted successfully");
});
