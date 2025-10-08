import { Op } from "sequelize";
import { Location } from "../models/index.js";

const createMany = async (locations) => {
  return await Location.bulkCreate(locations);
};

const findByCodes = async (codes) => {
  return await Location.findAll({ where: { code: codes } });
};

const findAll = async (ownerId) => {
  if (!ownerId) return [];
  return await Location.findAll({ where: { ownerId } });
};

const findById = async (id) => {
  return await Location.findByPk(id);
};

const findByCode = async (code) => {
  return await Location.findOne({ where: { code } });
};

const update = async (location, data) => {
  return await location.update(data);
};

const remove = async (location) => {
  return await location.destroy();
};

const search = async ({ where, limit, offset }) => {
  return await Location.findAndCountAll({
    where,
    limit,
    offset,
    order: [["locationName", "ASC"]],
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
