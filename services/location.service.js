import { Op } from "sequelize";
import { locationsArraySchema, locationUpdateSchema } from "../validations/location.validation.js";
import locationRepository from "../repositories/location.repository.js";
import countryRepository from "../repositories/country.repository.js";
import sequelize from "../config/db.js";

export const locationService = {
  createLocations: async (data, ownerId) => {
    const validation = locationsArraySchema.safeParse(data);
    if (!validation.success) return { error: validation.error.issues };
    if (!ownerId) return { error: "ownerId is required" };

    const locations = validation.data.map((l) => ({ ...l }));

    return await sequelize.transaction(async (tx) => {
      const createdCountryCache = {};

      for (const loc of locations) {
        if (loc.countryId) continue;

        if (!loc.countryName || !loc.countryCode) {
          return { error: [{ message: "countryId or (countryName + countryCode) required" }] };
        }

        const key = `${loc.countryName.trim().toLowerCase()}|${loc.countryCode.trim().toUpperCase()}|${ownerId}`;

        if (!createdCountryCache[key]) {
          let existing = await countryRepository.findByNameOrCode(loc.countryName.trim(), loc.countryCode.trim(), ownerId, { transaction: tx });

          if (!existing) {
            existing = await countryRepository.create({
              name: loc.countryName.trim(),
              code: loc.countryCode.trim().toUpperCase(),
              ownerId,
            }, { transaction: tx });
          }

          createdCountryCache[key] = existing.id;
        }

        loc.countryId = createdCountryCache[key];
        delete loc.countryName;
        delete loc.countryCode;
      }

      const toCreate = locations.map((loc) => ({ ...loc, ownerId }));

      const codes = toCreate.map((t) => t.code);
      const existingLocations = await locationRepository.findByCodes(codes, ownerId, { transaction: tx });
    if (existingLocations.length > 0) {
      return { conflict: existingLocations.map((e) => e.code) };
    }

    const created = await locationRepository.createMany(toCreate, { transaction: tx });

    return { created };
  });
  },
  getAll: async (ownerId) => {
    if (!ownerId) return { error: "ownerId is required" };
    return await locationRepository.findAll(ownerId);
  },
  getById: async (id, ownerId) => {
    if (!ownerId) return { error: "ownerId is required" };
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) return null;
    return location;
  },
  update: async (id, data, ownerId) => {
    if (!ownerId) return { error: "ownerId is required" };
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) return null;

    const validation = locationUpdateSchema.safeParse(data);
    if (!validation.success) return { error: validation.error.issues };

    if (data.code && data.code !== location.code) {
      const existing = await locationRepository.findByCode(data.code, ownerId);
      if (existing) return { conflict: data.code };
    }

    if (!data.countryId && (data.countryName || data.countryCode)) {
      const name = (data.countryName || "").trim();
      const code = (data.countryCode || "").trim();

      let existing = await countryRepository.findByNameOrCode(name, code, ownerId);
      if (!existing) {
        existing = await countryRepository.create({ name, code: code.toUpperCase(), ownerId });
      }
      data.countryId = existing.id;
      delete data.countryName;
      delete data.countryCode;
    }

    const updated = await locationRepository.update(location, data);
    return { updated };
  },
  delete: async (id, ownerId) => {
    if (!ownerId) return { error: "ownerId is required" };
    const location = await locationRepository.findById(id);
    if (!location || location.ownerId !== ownerId) return null;
    await locationRepository.delete(location);
    return true;
  },
  search: async ({ query, city, state, code, countryId, countryName, limit = 10, offset = 0, ownerId }) => {
    if (!ownerId) return { error: "ownerId is required" };
    const where = { ownerId };

    if (query) {
      where[Op.or] = [
        { city: { [Op.iLike]: `%${query}%` } },
        { state: { [Op.iLike]: `%${query}%` } },
        { code: { [Op.iLike]: `%${query}%` } },
      ];
    }

    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (state) where.state = { [Op.iLike]: `%${state}%` };
    if (code) where.code = code;

    if (countryName) {
      const matched = await countryRepository.findAllByName(countryName, ownerId);
      const ids = matched.map((c) => c.id);
      where.countryId = ids.length ? ids : -1;
    } else if (countryId) {
      where.countryId = countryId;
    }

    return await locationRepository.search({ where, limit, offset });
  },
};
