import sequelize from "../config/db.js";
import offerRepository from "../repositories/offer.repository.js";
import { createOfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups } from "../utlis/dateFormatter.js";
import { Op } from "sequelize";

async function createOffer(draftId, offerName, user) {
  const transaction = await sequelize.transaction();
  try {
    const draft = await offerRepository.findDraftById(draftId, transaction);
    if (!draft) throw new Error("Draft not found");

    if (!user?.businessName) throw new Error("Business name not found in token");

    // ✅ Step 1: Check if same business owner has same offer name
    const existingOffers = await offerRepository.findAllOffers({
      businessOwnerId: user.id,
    });

    if (existingOffers && existingOffers.length > 0) {
      const duplicate = existingOffers.find(
        (offer) => offer.offerName?.trim().toLowerCase() === offerName.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error("Offer name already exists for this business owner");
      }
    }

    // ✅ Step 2: Continue normal flow
    const offerData = {
      businessOwnerId: draft.businessOwnerId,
      offerName,
      businessName: user.businessName,
      fromParty: `${user.businessName} / ${user.userRole}`,
      origin: draft.origin,
      processor: draft.processor,
      plantApprovalNumber: draft.plantApprovalNumber,
      brand: draft.brand,
      draftName: draft.draftName,
      offerValidityDate: draft.offerValidityDate,
      shipmentDate: draft.shipmentDate,
      grandTotal: draft.grandTotal,
      quantity: draft.quantity,
      tolerance: draft.tolerance,
      paymentTerms: draft.paymentTerms,
      remark: draft.remark,
      productName: draft.productName,
      speciesName: draft.speciesName,
      packing: draft.packing,
      sizeBreakups: draft.sizeBreakups,
      total: draft.total,
      status: "open",
    };

    const parsed = createOfferSchema.safeParse(offerData);
    if (!parsed.success) {
      throw new Error(parsed.error.errors.map(e => e.message).join(", "));
    }

    const { sizeBreakups, total, grandTotal } = parsed.data;
    const validationError = validateSizeBreakups(sizeBreakups, total, grandTotal);
    if (validationError) throw new Error(validationError);

    const offer = await offerRepository.createOffer(parsed.data, transaction);
    await transaction.commit();
    return offer;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

async function getAllOffers(status, user) {
  const whereClause = {businessOwnerId: user.id};
  if (status) whereClause.status = status;
  return offerRepository.findAllOffers(whereClause);
}

async function getOfferById(id, user) {
  const offer = await offerRepository.findOfferById(id);
  if (!offer) throw new Error("Offer not found");

  if (offer.businessOwnerId !== user.id) {
    throw new Error("This offer does not belong to you.");
  }

  return offer;
}

async function updateOffer(id, updates, user) {
  const transaction = await sequelize.transaction();
  try {
    const offer = await offerRepository.findOfferById(id, transaction);
    if (!offer) throw new Error("Offer not found");
    
    if (offer.businessOwnerId !== user.id) {
      throw new Error("You are not authorized to update this offer");
    }

    if (offer.status === "close" || offer.isDeleted) {
      throw new Error("Cannot update a closed or deleted offer");
    }

    if (updates.offerValidityDate && typeof updates.offerValidityDate === "string") {
      updates.offerValidityDate = new Date(updates.offerValidityDate);
    }
    if (updates.shipmentDate && typeof updates.shipmentDate === "string") {
      updates.shipmentDate = new Date(updates.shipmentDate);
    }

    const schema = createOfferSchema.partial();
    const parsed = schema.safeParse(updates);

    if (!parsed.success) {
      const messages = parsed.error?.errors?.map(e => e.message) || ["Invalid input"];
      throw new Error(messages.join(", "));
    }

    if (parsed.data.sizeBreakups || parsed.data.total || parsed.data.grandTotal) {
      const validationError = validateSizeBreakups(
        parsed.data.sizeBreakups,
        parsed.data.total,
        parsed.data.grandTotal
      );
      if (validationError) throw new Error(validationError);
    }

    await offerRepository.updateOffer(offer, parsed.data, transaction);
    await transaction.commit();
    return offer;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

async function deleteOffer(id, user) {
  const transaction = await sequelize.transaction();
  try {
    const offer = await offerRepository.findOfferById(id, transaction);
    if (!offer) throw new Error("Offer not found");
    
    if (offer.businessOwnerId !== user.id) {
      throw new Error("You are not authorized to delete this offer");
    }

    if (offer.isDeleted) {
      throw new Error("Offer already deleted");
    }

    await offerRepository.updateOffer(
      offer,
      { isDeleted: true, status: "close" },
      transaction
    );

    await transaction.commit();
    return offer.id;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

async function changeOfferStatus(id, newStatus, user) {
  const transaction = await sequelize.transaction();
  try {
    const offer = await offerRepository.findOfferById(id, transaction);
    if (!offer) throw new Error("Offer not found");
    
    if (offer.businessOwnerId !== user.id) {
      throw new Error("This offer does not belong to you.");
    }

    if (offer.status.toLowerCase() === newStatus.toLowerCase()) {
      throw new Error(`Offer is already ${newStatus.toUpperCase()}`);
    }

    if (offer.isDeleted) {
      throw new Error("Cannot update a deleted offer");
    }

    await offerRepository.updateOffer(offer, { status: newStatus }, transaction);
    await transaction.commit();

    return offer;
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    throw err;
  }
}

export async function closeOffer(id, user) {
  return changeOfferStatus(id, "close", user);
}

export async function openOffer(id, user) {
  return changeOfferStatus(id, "open", user);
}

export async function searchOffers(query, user) {
  let { offerId, offerName, status, isDeleted, page = 1, limit = 20 } = query;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  if (isNaN(page) || page <= 0) page = 1;
  if (isNaN(limit) || limit <= 0) limit = 20;

  const filters = {
    businessOwnerId: user.id,
  };

  if (offerId) {
    if (isNaN(offerId)) throw new Error("Invalid offerId");
    filters.id = offerId;
  }

  if (offerName) {
    if (typeof offerName !== "string") throw new Error("Invalid offerName");
    filters.offer_name = { [Op.iLike]: `%${offerName}%` };
  }

  if (status) {
    if (typeof status !== "string") throw new Error("Invalid status");
    filters.status = status;
  }

  if (isDeleted !== undefined) {
    if (typeof isDeleted === "string") {
      isDeleted = isDeleted.toLowerCase() === "true";
    } else if (typeof isDeleted !== "boolean") {
      throw new Error("Invalid isDeleted value");
    }
    filters.isDeleted = isDeleted;
  }

  const { rows, count } = await offerRepository.searchOffers(filters, page, limit);

  return {
    total: count,
    page,
    limit,
    offers: rows,
  };
}

const offerService = {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  closeOffer,
  openOffer,
  searchOffers,
};

export default offerService;