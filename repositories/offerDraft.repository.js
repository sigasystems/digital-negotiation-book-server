import sequelize from "../config/db.js";
import OfferDraft from "../models/offerDraft.model.js";
import OfferDraftProduct from "../models/offerDraftProduct.model.js";
import SizeBreakup from "../models/sizeBreakup.js";

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

};

