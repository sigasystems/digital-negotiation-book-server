import offerService from "../services/offer.service.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { offerNegotiationService } from "../services/offerNegotiation.service.js";

export const createOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offer = await offerService.createOffer(req.params.id, req.body.offerName, req.user);
    return successResponse(res, 201, "Offer created from draft successfully", { offer });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getAllOffers = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const offers = await offerService.getAllOffers(req.query.status, req.user);
    return successResponse(res, 200, "Offers fetched successfully", { offers });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getOfferById = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offer = await offerService.getOfferById(req.params.id, req.user);
    return successResponse(res, 200, "Offer fetched successfully", { offer });
  } catch (err) {
    return errorResponse(res, 404, err.message);
  }
});

export const updateOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offer = await offerService.updateOffer(req.params.id, req.body, req.user);
    return successResponse(res, 200, "Offer updated successfully", { offer });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});  

export const closeOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offer = await offerService.closeOffer(req.params.id, req.user);
    return successResponse(res, 200, "Offer closed successfully", { offer });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const openOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offer = await offerService.openOffer(req.params.id, req.user);
    return successResponse(res, 200, "Offer reopened successfully", { offer });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const deleteOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const offerId = await offerService.deleteOffer(req.params.id, req.user);
    return successResponse(res, 200, "Offer deleted successfully", { offerId });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const searchOffers = asyncHandler(async (req, res) => {
  try {
    const result = await offerService.searchOffers(req.query, req.user);
    return successResponse(res, 200, "Offers fetched successfully", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const sendOffer = asyncHandler(async (req, res) => {
  try {
    const { id: offerId } = req.params;
    const { buyerIds, ...rest } = req.body;
    const result = await offerNegotiationService.sendOffer(req.user, offerId, buyerIds, rest);
    return successResponse(res, 200, "Offer sent successfully", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const respondOffer = asyncHandler(async (req, res) => {
  try {
    const { id: offerId } = req.params;
    const { buyerId, action } = req.body;
    const result = await offerNegotiationService.respondOffer(req.user, offerId, buyerId, action);
    return successResponse(res, 200, `Offer ${action}ed successfully`, result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getRecentNegotiations = asyncHandler(async (req, res) => {
  try {
    const { ownerId, buyerId } = req.body;
    const result = await offerNegotiationService.getRecentNegotiations(ownerId, buyerId);
    return successResponse(res, 200, "Recent negotiations", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getLatestNegotiation = asyncHandler(async (req, res) => {
  try {
    const { ownerId, buyerId } = req.body;
    const result = await offerNegotiationService.getLatestNegotiation(ownerId, buyerId);
    return successResponse(res, 200, "Latest negotiation", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});
