import sequelize from "../config/db.js";
import OfferDraft from "../models/offerDraft.model.js";
import OfferDraftProduct from "../models/offerDraftProduct.model.js";
import SizeBreakup from "../models/sizeBreakup.js";
import { Op } from "sequelize";

export const offerDraftRepository = {
  createWithProducts: async (draftData, products) => {
    const transaction = await sequelize.transaction();

    try {
      const offerDraft = await OfferDraft.create(draftData, { transaction });

      if (Array.isArray(products) && products.length > 0) {
        for (const p of products) {
          const createdDraftProduct = await OfferDraftProduct.create(
            {
              draftNo: offerDraft.draftNo,
              productId: p.productId,
              productName: p.productName,
              species: p.species,
              sizeDetails: p.sizeDetails || null,
              breakupDetails: p.breakupDetails || null,
              priceDetails: p.priceDetails || null,
              packing: p.packing || null
            },
            { transaction }
          );

          if (Array.isArray(p.sizeBreakups) && p.sizeBreakups.length > 0) {
            const sbData = p.sizeBreakups.map(sb => ({
              offerDraftProductId: createdDraftProduct.id,
              size: sb.size,
              breakup: sb.breakup,
              price: sb.price,
              condition: sb.condition || null,
            }));

            await SizeBreakup.bulkCreate(sbData, { transaction });
          }
        }
      }

      await transaction.commit();

      return await OfferDraft.findByPk(offerDraft.draftNo, {
        include: [
          {
            model: OfferDraftProduct,
            as: "draftProducts",
            include: [
              { model: SizeBreakup, as: "sizeBreakups" }
            ]
          }
        ]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  findByName: async (draftName) => {
    return OfferDraft.findOne({ where: { draftName } });
  },

  update: async (draftInstance, draftData) => {
  const transaction = await sequelize.transaction();

  try {
    if (!draftInstance || !draftInstance.draftNo) {
      throw new Error("Invalid draft instance passed to update()");
    }

    const draftNo = draftInstance.draftNo;

    // Lock the parent row ONLY
    await OfferDraft.findByPk(draftNo, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    // Fetch draft with relations (NO lock)
    const draft = await OfferDraft.findByPk(draftNo, {
      include: [
        {
          model: OfferDraftProduct,
          as: "draftProducts",
          include: [{ model: SizeBreakup, as: "sizeBreakups" }]
        }
      ],
      transaction
    });

    if (!draft) throw new Error("Offer draft not found");

    // Update ONLY draft fields (status, name, etc.)
    await draft.update(draftData, { transaction });

    await transaction.commit();

    // Return fully populated updated draft
    return await OfferDraft.findByPk(draftNo, {
      include: [
        {
          model: OfferDraftProduct,
          as: "draftProducts",
          include: [{ model: SizeBreakup, as: "sizeBreakups" }]
        }
      ]
    });

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
},


  findDraftById: async (draftNo) => {
    return OfferDraft.findOne({
      where: { draftNo },
      include: [
        {
          model: OfferDraftProduct,
          as: "draftProducts",
          include: [{ model: SizeBreakup, as: "sizeBreakups" }]
        }
      ]
    });
  },

  getLatestDraftNo: async () => {
    const lastDraft = await OfferDraft.findOne({
      order: [["draftNo", "DESC"]],
    });
    return lastDraft ? lastDraft.draftNo : null;
  },

findAll: async (businessOwnerId, { offset, pageSize }) => {
  const { rows, count } = await OfferDraft.findAndCountAll({
    where: { businessOwnerId },
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset,
    include: [
      {
        model: OfferDraftProduct,
        as: "draftProducts",
        include: [{ model: SizeBreakup, as: "sizeBreakups" }]
      }
    ]
  });

  return { drafts: rows, total: count };
},

 delete: async (draftNo) => {
    const draft = await OfferDraft.findByPk(draftNo);
    if (!draft) throw new Error("Offer draft not found");
    if (draft.deletedAt) throw new Error("Offer draft already deleted");

    await draft.destroy();

    return draft;
  },

search: async (ownerId, filters = {}, pagination = {}) => {
  const where = {
    businessOwnerId: ownerId,
    isDeleted: false,
  };

  if (filters.draftNo) {
    where.draftNo = Number(filters.draftNo);
  }

  if (filters.draftName) {
    where.draftName = {
      [Op.iLike]: `%${filters.draftName.trim()}%`,
    };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const limit = Number(pagination.limit || 10);
  const page = Number(pagination.page || 0);
  const offset = page * limit;

  if (filters.productName) {
    const productNameFilter = filters.productName.trim();
    
    const matchingDrafts = await OfferDraftProduct.findAll({
        where: {
          productName: {
            [Op.iLike]: `%${productNameFilter}%`,
          }
        },
      attributes: ['draftNo'],
      distinct: true,
    });

    const draftNumbers = matchingDrafts.map(d => d.draftNo);
    
    if (draftNumbers.length > 0) {
      where.draftNo = {
        [Op.in]: draftNumbers,
      };
    } else {
      return { count: 0, rows: [] };
    }
  }

  return OfferDraft.findAndCountAll({
    where,
    include: [{
      model: OfferDraftProduct,
      as: 'draftProducts',
      required: false,
    }],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });
}
};

