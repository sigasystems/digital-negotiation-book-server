import { Op } from "sequelize";
import  {Location}  from "../models/index.js";


export const locationRepository = {
  createMany: async (locations) => {
    return await Location.bulkCreate(locations);
  },

  findByCodes: async (codes) => {
    return await Location.findAll({ where: { code: codes } });
  },

  findAll: async () => {
    return await Location.findAll();
  },

  findById: async (id) => {
    return await Location.findByPk(id);
  },

  findByCode: async (code) => {
    return await Location.findOne({ where: { code } });
  },

  update: async (location, data) => {
    return await location.update(data);
  },

  delete: async (location) => {
    return await location.destroy();
  },

  search: async ({ where, limit, offset }) => {
    return await Location.findAndCountAll({
      where,
      limit,
      offset,
      order: [["locationName", "ASC"]],
    });
  },
};
