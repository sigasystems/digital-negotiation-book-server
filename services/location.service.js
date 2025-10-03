import { locationRepository } from "../repositories/location.repository.js";

import { Op } from "sequelize";
import { locationsArraySchema, locationUpdateSchema } from "../validations/location.validation.js";

export const locationService = {
  createLocations: async (data) => {
    const validation = locationsArraySchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.issues };
    }

    const locationsToCreate = validation.data;
    const codes = locationsToCreate.map((loc) => loc.code);

    const existing = await locationRepository.findByCodes(codes);
    if (existing.length > 0) {
      return { conflict: existing.map((e) => e.code) };
    }

    const created = await locationRepository.createMany(locationsToCreate);
    return { created };
  },

  getAll: async () => {
    return await locationRepository.findAll();
  },

  getById: async (id) => {
    return await locationRepository.findById(id);
  },

  update: async (id, data) => {
    const location = await locationRepository.findById(id);
    if (!location) return null;

    const validation = locationUpdateSchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.issues };
    }

    if (data.code && data.code !== location.code) {
      const existing = await locationRepository.findByCode(data.code);
      if (existing) return { conflict: data.code };
    }

    const updated = await locationRepository.update(location, data);
    return { updated };
  },

  delete: async (id) => {
    const location = await locationRepository.findById(id);
    if (!location) return null;
    await locationRepository.delete(location);
    return true;
  },

  search: async ({ query, country, code, portalCode, limit, offset }) => {
    const where = {};

    if (query) {
      where[Op.or] = [
        { locationName: { [Op.iLike]: `%${query}%` } },
        { code: { [Op.iLike]: `%${query}%` } },
        { portalCode: { [Op.iLike]: `%${query}%` } },
        { country: { [Op.iLike]: `%${query}%` } },
      ];
    }
    if (country) where.country = country;
    if (code) where.code = code;
    if (portalCode) where.portalCode = portalCode;

    return await locationRepository.search({ where, limit, offset });
  },
};
