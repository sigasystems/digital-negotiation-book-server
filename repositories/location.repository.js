import { Op } from "sequelize";
import { Location } from "../models/index.js";

class LocationRepository {
  async createMany(locations) {
    return await Location.bulkCreate(locations);
  }

  async findByCodes(codes) {
    return await Location.findAll({ where: { code: codes } });
  }

  async findAll(ownerId) {
    if (!ownerId) return [];
    return await Location.findAll({ where: { ownerId } });
  }

  async findById(id) {
    return await Location.findByPk(id);
  }

  async findByCode(code) {
    return await Location.findOne({ where: { code } });
  }

  async update(location, data) {
    return await location.update(data);
  }

  async delete(location) {
    return await location.destroy();
  }

  async search({ where, limit, offset }) {
    return await Location.findAndCountAll({
      where,
      limit,
      offset,
      order: [["locationName", "ASC"]],
    });
  }
}

// Export a singleton instance
export default new LocationRepository();
