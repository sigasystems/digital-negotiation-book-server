import offerService from "../services/offer.service.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { successResponse, errorResponse } from "../handlers/responseHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import { offerNegotiationService } from "../services/offerNegotiation.service.js";
import {Buyer, Offer, OfferBuyer, OfferProduct} from "../models/index.js";

export const createOffer = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner", "buyer"]);

    const result = await offerService.createOffer(req.body, req.user);

    return successResponse(res, 201, "Offer created successfully", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const createOfferVersion = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner", "buyer"]);

    const result = await offerService.createOfferVersion(
      req.params.offerId,
      req.body,
      req.user
    );

    return successResponse(res, 201, "New offer version created", result);
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getAllOffers = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);

    const pageIndex = parseInt(req.query.pageIndex) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status || null;

    const offersPaginated = await offerService.getAllOffers(req.user, {
      pageIndex,
      pageSize,
      status,
    });

    return successResponse(
      res,
      200,
      "Offers fetched successfully",
      offersPaginated
    );
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message);
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

export const getNegotiations = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner", "buyer"]);
    const negotiations = await offerNegotiationService.getNegotiations(
      req.params.id,
      req.user
    );
    return successResponse(
      res,
      200,
      "Negotiations fetched successfully",
      { negotiations }
    );
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

    const offerId = parseInt(req.params.id, 10);
    if (Number.isNaN(offerId)) {
      return errorResponse(res, 400, "offerId must be an integer");
    }

    let buyerId;

    const offerBuyerRow = await OfferBuyer.findOne({
      where: { offerId },
      attributes: ["buyerId"],
    });

    if (!offerBuyerRow) {
      return successResponse(res, 200, "No negotiations found", []);
    }

    buyerId = offerBuyerRow.buyerId;

    if (!buyerId) {
      return successResponse(res, 200, "No negotiations found", []);
    }

    const offerBuyer = await offerNegotiationService.getOfferBuyerSafe(
      offerId,
      buyerId
    );

    if (!offerBuyer) {
      return successResponse(res, 200, "No negotiations found", []);
    }

    const offer = await Offer.findOne({
      where: { id: offerId },
      include: [
        {
          model: OfferProduct,
          as: "products",
        },
      ],
    });

    if (!offer) {
      return successResponse(res, 200, "No offer found", []);
    }

    const latestVersion = await offerNegotiationService.getLatestVersionSafe(
      offerId,
      buyerId
    );

    if (!latestVersion) {
      return successResponse(res, 200, "No negotiations found", []);
    }
    const history = await offerNegotiationService.getVersionHistorySafe(
      offerId,
      buyerId,
      latestVersion.versionNo
    );

    return successResponse(res, 200, "Latest negotiation history", {
      // offer,
      products: offer.products,
      latestVersion,
      // history,
    });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});

export const getNextOfferName = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["business_owner"]);
    const businessOwnerId = req.user?.businessOwnerId;
    if (!businessOwnerId)
      return errorResponse(res, 401, "Unauthorized: businessOwnerId missing");
    const offerName = await offerService.getNextOfferName(businessOwnerId);
    return successResponse(res, 200, "Next offer name generated", { offerName });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
});
