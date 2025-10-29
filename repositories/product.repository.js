import { Op } from "sequelize";
import { Product } from "../models/index.js";

const createMany = async (products) => {
  return await Product.bulkCreate(products);
};

const findAll = async (ownerId, { page, limit }) => {
  const offset = (page - 1) * limit;

  const { rows: products, count: total } = await Product.findAndCountAll({
    where: { ownerId },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return { products, total };
};


const findById = async (id) => {
  return await Product.findByPk(id);
};

const findByCode = async (code, ownerId) => {
  const where = ownerId ? { code, ownerId } : { code };
  return await Product.findOne({ where });
};

const findByCodes = async (codes, ownerId) => {
  const where = ownerId ? { code: codes, ownerId } : { code: codes };
  return await Product.findAll({ where });
};

const update = async (product, data) => {
  return await product.update(data);
};

const remove = async (product) => {
  return await product.destroy();
};

const search = async (filters, pagination) => {
  const { limit, offset } = pagination;
  return await Product.findAndCountAll({
    where: filters,
    limit,
    offset,
    order: [["productName", "ASC"]],
  });
};

export default {
  createMany,
  findAll,
  findById,
  findByCode,
  findByCodes,
  update,
  delete: remove,
  search,
};
