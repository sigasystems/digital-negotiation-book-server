import { Op } from "sequelize";
import { Product } from "../models/index.js";

export const ProductRepository = {
  createMany: async (products) => {
    return await Product.bulkCreate(products);
  },

  findAll: async () => {
    return await Product.findAll();
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

  search: async (filters, pagination) => {
    const { limit, offset } = pagination;
    return await Product.findAndCountAll({
      where: filters,
      limit,
      offset,
      order: [["productName", "ASC"]],
    });
  },
};
