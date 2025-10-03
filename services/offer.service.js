import sequelize from "../config/db.js"
import offerRepository from "../repositories/offer.repository.js";
import offerDraftRepository from "../repositories/offerDraft.repository.js";
import { createOfferSchema } from "../validations/offer.validation.js";
import { validateSizeBreakups } from "../utlis/dateFormatter.js";
import { Offer, OfferBuyer, OfferVersion, OfferResult, Buyer, BusinessOwner } from "../models/index.js"
import { Op } from "sequelize";

class OfferService {
    async createOffer(draftId, offerName, user) {
        const transaction = await sequelize.transaction();
        try {
            const draft = await offerDraftRepository.findDraftById(draftId, transaction);
            if (!draft) throw new Error("Draft not found")
                
            if (draft.businessOwnerId !== user.id) {
            throw new Error("Draft does not belong to this Business Owner");
            }

            if (!user?.businessName) {
            throw new Error("Business name not found in token");
            }

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

    async getAllOffers(user, status) {
    if (!user?.id) {
        throw new Error("Business Owner ID not found in token");
    }

    const whereClause = { businessOwnerId: user.id };
    if (status) {
        whereClause.status = status;
    }

    return offerRepository.findAllOffers(whereClause);
    }

    async getOfferById(req) {
        if (!req?.user?.id) {
            throw new Error("Business Owner ID not found in token.");
        }

        const offer = await offerRepository.findOfferById(req.params.id);

        if (!offer) {
            throw new Error("Offer not found");
        }

        if (offer.businessOwnerId !== req.user.id) {
            throw new Error("This offer does not belong to your account.");
        }

        return offer;
    }

  async updateOffer(id, updates, user) {
    if (!id || typeof id !== "string" && typeof id !== "number") {
    throw new Error("Invalid offer ID");
  }

  const transaction = await sequelize.transaction();
  try {
    const offer = await offerRepository.findOfferById(id, transaction);
    if (!offer) throw new Error("Offer not found");

    if (offer.businessOwnerId !== user.id) {
      throw new Error("This offer does not belong to your account");
    }

    if (offer.status === "close" || offer.isDeleted) {
      throw new Error("Cannot update a closed or deleted offer");
    }

    if (updates.offerValidityDate) {
    updates.offerValidityDate = new Date(updates.offerValidityDate);
    }

    if (updates.shipmentDate) {
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

  async closeOffer(id) {
    return this.#changeOfferStatus(id, "close");
  }

  async openOffer(id) {
    return this.#changeOfferStatus(id, "open");
  }

  async deleteOffer(id) {
    const transaction = await sequelize.transaction();
    try {
      const offer = await offerRepository.findOfferById(id, transaction);
      if (!offer) throw new Error("Offer not found");
      if (offer.isDeleted) throw new Error("Offer already deleted");

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

    async searchOffers(query, user) {
    const { offerId, offerName, status, isDeleted, page = 1, limit = 20 } = query;
    const filters = {};

    // Restrict to logged-in user's offers
    filters.businessOwnerId = user.id; // or user.businessOwnerId if stored differently

    if (offerId) filters.id = offerId;
    if (offerName) filters.offer_name = { [Op.iLike]: `%${offerName}%` };
    if (status) filters.status = status;
    if (isDeleted !== undefined) filters.isDeleted = isDeleted === "true";

    const { rows, count } = await offerRepository.searchOffers(
        filters,
        parseInt(page, 10),
        parseInt(limit, 10)
    );

    return { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10), offers: rows };
    }

  // Private helper
  async #changeOfferStatus(id, newStatus) {
    const transaction = await sequelize.transaction();
    try {
      const offer = await offerRepository.findOfferById(id, transaction);
      if (!offer) throw new Error("Offer not found");

      if (offer.status === newStatus) {
        throw new Error(`Offer is already ${newStatus}`);
      }
      if (offer.isDeleted) throw new Error("Cannot update a deleted offer");

      await offerRepository.updateOffer(offer, { status: newStatus }, transaction);
      await transaction.commit();
      return offer;
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  }
}

export const offerNegotiationService = {
  async sendOffer(user, offerId, buyerIds, data) {
    const transaction = await sequelize.transaction();
    try {
      const userId = user?.id;
      const userRole = user?.userRole;
      const businessName = user?.businessName;
      let owner, buyers;

      const offer = await Offer.findByPk(offerId, { transaction });
      if (!offer || offer.status === "close" || offer.isDeleted) {
        throw new Error("Offer not found or closed/deleted");
      }

      if (userRole === "business_owner") {
        buyers = await Buyer.findAll({ where: { id: buyerIds }, transaction });
        if (buyers.length !== buyerIds.length) {
          throw new Error("Some buyers not found");
        }
        for (const buyer of buyers) {
          if (buyer.ownerId !== userId) {
            throw new Error(`Buyer ${buyer.buyersCompanyName} is not registered under your business`);
          }
        }
        owner = await BusinessOwner.findOne({ where: { id: userId, status: "active" }, transaction });
      } else if (userRole === "buyer") {
        const buyer = await Buyer.findByPk(userId, { transaction });
        if (!buyer || !buyerIds.includes(userId)) {
          throw new Error("Unauthorized buyer");
        }
        buyers = [buyer];
        owner = await BusinessOwner.findOne({ where: { id: buyer.ownerId, status: "active" }, transaction });
      } else {
        throw new Error("Unauthorized role");
      }

      // Ensure OfferBuyer mapping
      const existingOfferBuyers = await OfferBuyer.findAll({
        where: { offerId, buyerId: buyerIds },
        transaction
      });
      const existingBuyerIds = existingOfferBuyers.map(b => b.buyerId);

      const newOfferBuyers = buyerIds
        .filter(id => !existingBuyerIds.includes(id))
        .map(buyerId => ({
          offerId,
          buyerId,
          ownerId: userRole === "business_owner" ? userId : owner?.id || null,
          status: "open"
        }));

      const createdOfferBuyers = await OfferBuyer.bulkCreate(newOfferBuyers, { transaction, returning: true });
      const allOfferBuyers = [...existingOfferBuyers, ...createdOfferBuyers];

      for (const ob of allOfferBuyers) {
        if (ob.status !== "close") {
          const lastVersion = await OfferVersion.findOne({
            where: { offerBuyerId: ob.id },
            order: [["versionNo", "DESC"]],
            transaction
          });
          const nextVersionNo = lastVersion ? lastVersion.versionNo + 1 : 1;

          let fromParty, toParty;
          const buyer = buyers.find(b => b.id === ob.buyerId);
          if (userRole === "business_owner") {
            fromParty = `${businessName} / business_owner`;
            toParty = `${buyer?.buyersCompanyName} / buyer`;
          } else {
            fromParty = `${buyer?.buyersCompanyName} / buyer`;
            toParty = `${owner?.businessName} / business_owner`;
          }

          await OfferVersion.create({
            offerBuyerId: ob.id,
            versionNo: nextVersionNo,
            fromParty,
            toParty,
            offerName: offer.offerName,
            productName: data.productName ?? offer.productName,
            speciesName: data.speciesName ?? offer.speciesName,
            brand: data.brand ?? offer.brand,
            plantApprovalNumber: data.plantApprovalNumber ?? offer.plantApprovalNumber,
            quantity: data.quantity ?? offer.quantity,
            tolerance: data.tolerance ?? offer.tolerance,
            paymentTerms: data.paymentTerms ?? offer.paymentTerms,
            sizeBreakups: data.sizeBreakups ?? offer.sizeBreakups,
            grandTotal: data.grandTotal ?? offer.grandTotal,
            shipmentDate: data.shipmentDate ?? offer.shipmentDate,
            remark: data.remark ?? offer.remark,
            status: "open"
          }, { transaction });
        }
      }

      await transaction.commit();
      return { offerId, buyers, owner, businessName, userRole };
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  },

  async respondOffer(user, offerId, buyerId, action) {
    const transaction = await sequelize.transaction();
    try {
      const userId = user?.id;
      const userRole = user?.userRole;

      const offer = await Offer.findByPk(offerId, { transaction });
      if (!offer || offer.status === "close" || offer.isDeleted) {
        throw new Error("Offer not found or closed/deleted");
      }

      const buyer = await Buyer.findByPk(buyerId, { transaction });
      if (!buyer) throw new Error("Buyer not found");

      let owner;
      if (userRole === "business_owner") {
        owner = await BusinessOwner.findByPk(userId, { transaction });
        if (!owner || owner.status !== "active") throw new Error("Inactive business owner");
      } else {
        owner = await BusinessOwner.findByPk(buyer.ownerId, { transaction });
        if (!owner || owner.status !== "active") throw new Error("Inactive buyer owner");
      }

      const offerBuyer = await OfferBuyer.findOne({ where: { offerId, buyerId }, transaction });
      if (!offerBuyer) throw new Error("OfferBuyer not found");

      const lastVersion = await OfferVersion.findOne({
        where: { offerBuyerId: offerBuyer.id },
        order: [["versionNo", "DESC"]],
        transaction
      });

      const offerResult = await OfferResult.create({
        offerVersionId: lastVersion?.id,
        offerId,
        ownerId: owner.id,
        buyerId: buyer.id,
        isAccepted: action === "accept" ? true : null,
        isRejected: action === "reject" ? true : null,
        offerName: offer.offerName,
        ownerCompanyName: owner.businessName,
        buyerCompanyName: buyer.buyersCompanyName
      }, { transaction });

      await transaction.commit();
      return offerResult;
    } catch (err) {
      if (!transaction.finished) await transaction.rollback();
      throw err;
    }
  },

  async getRecentNegotiations(ownerId, buyerId) {
    const offerBuyers = await OfferBuyer.findAll({
      where: { ...(ownerId && { ownerId }), ...(buyerId && { buyerId }) },
      include: [{ model: OfferVersion, as: "versions", order: [["versionNo", "DESC"]] }]
    });

    return offerBuyers.flatMap(ob =>
      ob.versions.map(v => ({
        offerId: v.offerId,
        versionNo: v.versionNo,
        fromParty: v.fromParty,
        toParty: v.toParty,
        productName: v.productName,
        grandTotal: v.grandTotal,
        offerName: v.offerName,
        createdAt: v.createdAt
      }))
    );
  },

  async getLatestNegotiation(ownerId, buyerId) {
    const offerBuyer = await OfferBuyer.findOne({ where: { ...(ownerId && { ownerId }), ...(buyerId && { buyerId }) } });
    if (!offerBuyer) return [];

    const latestVersion = await OfferVersion.findOne({
      where: { offerBuyerId: offerBuyer.id },
      order: [["versionNo", "DESC"]]
    });
    if (!latestVersion) return [];

    const versions = await OfferVersion.findAll({
      where: { offerBuyerId: offerBuyer.id, versionNo: { [Op.lte]: latestVersion.versionNo } },
      order: [["versionNo", "ASC"]]
    });

    return versions;
  }
};


export default new OfferService();
