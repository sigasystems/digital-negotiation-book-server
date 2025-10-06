import { Op } from "sequelize";
import { locationsArraySchema , locationUpdateSchema } from "../validations/location.validation.js";
import  locationRepository  from "../repositories/location.repository.js";
export const locationService = {
  // CREATE locations for a specific owner
  createLocations: async (data, ownerId) => {
    const validation = locationsArraySchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.issues };
    }

    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    const locationsToCreate = validation.data.map((loc) => ({
      ...loc,
      ownerId,
    }));
    const codes = locationsToCreate.map((loc) => loc.code);
    const existing = await locationRepository.findByCodes(codes, ownerId);

    if (existing.length > 0) {
      return { conflict: existing.map((e) => e.code) };
    }

    const created = await locationRepository.createMany(locationsToCreate);
    return { created };
  },
  // GET all locations for specific owner
  getAll: async (ownerId) => {
    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    return await locationRepository.findAll(ownerId);
  },
  // GET location by id (also check owner)
  getById: async (id, ownerId) => {
    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) {
      return null; // not found or unauthorized
    }
    return location;
  },
  // UPDATE location (only if it belongs to the owner)
  update: async (id, data, ownerId) => {
    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) {
      return null;
    }

    const validation = locationUpdateSchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.issues };
    }

    if (data.code && data.code !== location.code) {
      const existing = await locationRepository.findByCode(data.code, ownerId);
      if (existing) return { conflict: data.code };
    }

    const updated = await locationRepository.update(location, data);
    return { updated };
  },
  // DELETE location (only if it belongs to the owner)
  delete: async (id, ownerId) => {
    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) {
      return null;
    }
    await locationRepository.delete(location);
    return true;
  },
  // SEARCH locations (only within owner’s scope)
  search: async ({ query, country, code, portalCode, limit, offset, ownerId }) => {
    if (!ownerId) {
      return { error: "ownerId is required" };
    }
    const where = { ownerId };

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
