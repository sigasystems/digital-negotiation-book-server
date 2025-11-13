import sequelize from "../config/db.js";
import offerRepository from "../repositories/offer.repository.js";
import { createOfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups } from "../utlis/dateFormatter.js";
import { withTransaction, validateOfferData, ensureOfferOwnership, normalizeDateFields } from "../utlis/offerHelpers.js";
import { Op } from "sequelize";

const offerService = {
  async createOffer(draftNo, offerBody, user) {
    return withTransaction(sequelize, async (t) => {
      const { offerName, ...restData } = offerBody;

      if (!offerName || typeof offerName !== "string" || !offerName.trim()) {
        throw new Error("Offer name is required and must be a non-empty string");
      }

    const draft = await offerRepository.findDraftById(draftNo, t);
    if (!draft) throw new Error("Draft not found");

    if (draft.businessOwnerId !== user.businessOwnerId) {
      throw new Error("You are not authorized to create an offer for this draft");
    }

    if (!user?.businessName) throw new Error("Business name not found in token");

      // Check duplicate offer names
    const existingOffers = await offerRepository.findAllOffers({
      businessOwnerId: user.businessOwnerId,
    });

   if (
       existingOffers?.some(
          (o) => o.offerName?.toLowerCase() === offerName.toLowerCase()
        )
      ) {
        throw new Error("Offer name already exists for this business owner");
      }

      if (!draft.draftProducts || draft.draftProducts.length === 0) {
        throw new Error(
          "Draft must have at least one product before creating an offer"
        );
      }

      const enrichedProducts = (restData.products || []).map((p, index) => {
        const draftProduct = draft.draftProducts[index];
          return {
              ...draftProduct,
              ...p,
              productName: p.productName || draftProduct.productName || "",
            };
      });

      const mergedData = {
        ...draft.dataValues,
        ...restData,
        products: enrichedProducts,
        draftProducts: draft.draftProducts,
      };

      const createdOffer = await offerRepository.createOffer(
        mergedData,
        offerName,
        user,
        t
      );

      return createdOffer;
    });
  },
  async getAllOffers(user, { pageIndex = 0, pageSize = 10, status = null } = {}) {
    const where = { businessOwnerId: user.businessOwnerId,
      ...(status && { status }),
    };

    const offers = await offerRepository.findAllOffers(where);

    const formattedOffers = offers.map((o) => o.toJSON());

    const totalItems = formattedOffers.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const start = pageIndex * pageSize;
    const paginatedOffers = formattedOffers.slice(start, start + pageSize);

    return {
      data: paginatedOffers,
      totalItems,
      totalPages,
      pageIndex,
      pageSize,
    };
  },

  async getOfferById(id, user) {
    const offer = await offerRepository.findOfferById(id);
    if (!offer) throw new Error("Offer not found");
    ensureOfferOwnership(offer, user);
    return offer;
  },

  async updateOffer(id, updates, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);
      if (offer.status === "close" || offer.isDeleted)
        throw new Error("Cannot update a closed or deleted offer");

      normalizeDateFields(updates);
      const validUpdates = validateOfferData(updates, createOfferSchema.partial());

      if (validUpdates.sizeBreakups || validUpdates.total || validUpdates.grandTotal) {
        const validationError = validateSizeBreakups(
          validUpdates.sizeBreakups,
          validUpdates.total,
          validUpdates.grandTotal
        );
        if (validationError) throw new Error(validationError);
      }

      await offerRepository.updateOffer(offer, validUpdates, t);
      return offer;
    });
  },

  async deleteOffer(id, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);
      if (offer.isDeleted) throw new Error("Offer already deleted");

      await offerRepository.updateOffer(offer, { isDeleted: true, status: "close" }, t);
      return offer.id;
    });
  },

  async changeOfferStatus(id, newStatus, user) {
    return withTransaction(sequelize, async (t) => {
      const offer = await offerRepository.findOfferById(id, t);
      if (!offer) throw new Error("Offer not found");
      ensureOfferOwnership(offer, user);

      if (offer.isDeleted) throw new Error("Cannot update a deleted offer");
      if (offer.status.toLowerCase() === newStatus.toLowerCase()) {
        throw new Error(`Offer is already ${newStatus.toUpperCase()}`);
      }

      await offerRepository.updateOffer(offer, { status: newStatus }, t);
      return offer;
    });
  },

  closeOffer(id, user) {
    return this.changeOfferStatus(id, "close", user);
  },

  openOffer(id, user) {
    return this.changeOfferStatus(id, "open", user);
  },

  async searchOffers(query, user) {
    let { offerId, offerName, status, isDeleted, page = 1, limit = 20 } = query;
    page = +page || 1;
    limit = +limit || 20;

    const filters = { businessOwnerId: user.id };
    if (offerId) filters.id = +offerId;
    if (offerName) filters.offer_name = { [Op.iLike]: `%${offerName}%` };
    if (status) filters.status = status;
    if (isDeleted !== undefined)
      filters.isDeleted = String(isDeleted).toLowerCase() === "true";

    const { rows, count } = await offerRepository.searchOffers(filters, page, limit);

    return {
      total: count,
      page,
      limit,
      offers: rows,
    };
  },
};

export default offerService;