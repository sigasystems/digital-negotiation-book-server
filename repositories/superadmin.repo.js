import { Op } from "sequelize";
import {User , Buyer , BusinessOwner} from "../models/index.js";
import sequelize from "../config/db.js";

const createUser = async () => {
  try {
    return User.create(data, { transaction });
  } catch (error) {}
};

export default { createUser };

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

  updateOwner: (owner, data) => owner.update(data),

  softDelete: (owner) => {
    owner.is_deleted = true;
    owner.status = "inactive";
    return owner.save();
  },

  activateOwner: (owner) => {
    owner.status = "active";
    owner.is_approved = true;
    return owner.save();
  },

  deactivateOwner: (owner) => {
    owner.status = "inactive";
    return owner.save();
  },

 reviewOwner: async (ownerId, isApproved) => {
  const owner = await BusinessOwner.findByPk(ownerId); // or findOne({ where: { id: ownerId }})
  if (!owner) {
    throw new Error("Business owner not found");
  }
  owner.is_approved = isApproved;
  await owner.save();
  return owner; // return updated object
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
