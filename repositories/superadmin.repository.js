import { Op } from "sequelize";
import {User , Buyer , BusinessOwner} from "../models/index.js";
import sequelize from "../config/db.js";

export const superAdminRepo = {
  transaction: () => sequelize.transaction(),

  createUser: (data, transaction) => User.create(data, { transaction }),

  createOwner: (data, transaction) =>
    BusinessOwner.create(data, { transaction }),

  findById: (id, options = {}) => BusinessOwner.findByPk(id, options),

  findAll: (options = {}) => BusinessOwner.findAll(options),

  findByPhone: (phone) =>
    BusinessOwner.findOne({ where: { phoneNumber: phone } }),

  findByEmail: (email) => User.findOne({ where: { email } }),
  findBusinessOwnerByName: (businessName) =>
    BusinessOwner.findOne({ where: { businessName: businessName.trim() } }),

  updateOwner: (owner, data) => owner.update(data),

   softDeleteOwner: async (ownerId) => {
    const owner = await BusinessOwner.findByPk(ownerId);
    if (!owner) throw new Error("Owner not found");

    await owner.update({ is_deleted: true, status: "inactive" });

    return owner;
  },

  activateOwner: async (ownerId) => {
    const owner = await BusinessOwner.findByPk(ownerId);
    if (!owner) throw new Error("Owner not found");

    await owner.update({ status: "active", is_approved: true });
    return owner;
  },

  deactivateOwner: async (ownerId) => {
  const owner = await BusinessOwner.findByPk(ownerId);
  if (!owner) throw new Error("Owner not found");

    await owner.update({ status: "inactive" });

  return owner;
},

 reviewOwner: async (ownerId, isApproved) => {
  const owner = await BusinessOwner.findByPk(ownerId);
  if (!owner) throw new Error("Business owner not found");

    await owner.update({ is_approved: isApproved });
    return owner;
  },

  async searchBusinessOwners(filters = {}, { limit = 10, offset = 0 }) {
    const where = {};

    const likeFilter = (key, value) => {
    if (value !== undefined && value !== null) {
      const val = String(value).trim();
      if (val) where[key] = { [Op.iLike]: `%${val}%` };
    }
  };

    likeFilter("first_name", filters.first_name);
    likeFilter("last_name", filters.last_name);
    likeFilter("email", filters.email);
    likeFilter("businessName", filters.businessName);
    likeFilter("phoneNumber", filters.phoneNumber);
    likeFilter("postalCode", filters.postalCode);

    if (filters.status) where.status = filters.status;
    where.is_deleted = false;

    return BusinessOwner.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [["createdAt", "DESC"]],
  });
},



  includeBuyers: () => ({
    include: [
      {
        model: Buyer,
        as: "buyers",
        attributes: [
          "id",
          "ownerId",
          "buyersCompanyName",
          "registrationNumber",
          "status",
        ],
      },
    ],
  }),
};
