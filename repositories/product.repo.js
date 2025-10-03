import { Op } from "sequelize";
import { BusinessOwner, Product } from "../models/index.js";

export const ProductRepository = {
  createMany: async (products) => {
    return await Product.bulkCreate(products);
  },

  findAll: async (ownerid) => {
  return await Product.findAll({
    where: { ownerid }, // use correct column name
    include: [
      {
        model: BusinessOwner,
        as: "owner",
        attributes: ["id", "businessName", "email"], // pick fields you want
      },
    ],
  });
},

  findById: async (id) => {
    return await Product.findByPk(id);
  },

  findByCode: async (code) => {
    return await Product.findOne({ where: { code } });
  },

  findByCodes: async (codes) => {
    return await Product.findAll({ where: { code: codes } });
  },

  update: async (product, data) => {
    return await product.update(data);
  },

  delete: async (product) => {
    return await product.destroy();
  },

  searchByOwner: async (ownerid, filters, pagination) => {
  const { limit, offset } = pagination;
  return await Product.findAndCountAll({
    where: { ...filters, ownerid },
    limit,
    offset,
    order: [["productName", "ASC"]],
  });
},

};
