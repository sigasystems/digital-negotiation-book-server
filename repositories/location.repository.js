import { Op } from "sequelize";
import { Location, Country } from "../models/index.js";

const createMany = async (locations, options = {}) => {
  return await Location.bulkCreate(locations, { returning: true, ...options });
};

const findByCodes = async (codes, ownerId, options = {}) => {
  if (!codes || codes.length === 0) return [];
  return await Location.findAll({
    where: {
      ownerId,
      code: { [Op.in]: codes },
    },
    ...options,
  });
};

const findAll = async (ownerId) => {
  if (!ownerId) throw new Error("ownerId is required");
  return await Location.findAll({
    where: { ownerId },
    order: [["city", "ASC"]],
    attributes: ["id", "city", "state", "code"],
    include: [
      {
        model: Country,
        as: "country",
        attributes: ["id", "name", "code"],
      },
    ],
  });
};

const findById = async (id) => {
  return await Location.findByPk(id, {
    include: [
      {
        model: Country,
        attributes: ["id", "name", "code"],
      },
    ],
  });
};

const findByCode = async (code, ownerId) => {
  return await Location.findOne({ where: { code, ownerId }, });
};

const update = async (locationInstance, data) => {
  return await locationInstance.update(data);
};

const remove = async (locationInstance) => {
  return await locationInstance.destroy();
};

const search = async ({ where, limit, offset }) => {
  return await Location.findAndCountAll({
    where,
    limit,
    offset,
    order: [["city", "ASC"]],
    include: [
      {
        model: Country,
        attributes: ["id", "name", "code"],
      },
    ],
  });
};

export default {
  createMany,
  findByCodes,
  findAll,
  findById,
  findByCode,
  update,
  delete: remove,
  search,
};
