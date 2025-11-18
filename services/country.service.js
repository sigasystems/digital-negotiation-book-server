import { updateCountrySchema } from "../validations/country.schema.js";
import countryRepository from "../repositories/country.repository.js";
import { locationsArraySchema, updateLocationSchema } from "../validations/location.validation.js";
import {Country,Location} from "../models/index.js";

const assertOwnerMatch = (recordOwnerId, userOwnerId) => {
  if (!recordOwnerId || !userOwnerId) {
    throw new Error("Unauthorized: owner information missing");
  }

  if (recordOwnerId !== userOwnerId) {
    throw new Error("Forbidden: You do not own this resource");
  }
};

export const createWithCountry = async (data, user) => {
  const ownerid =
    user?.ownerId ||
    user?.businessOwnerId ||
    user?.businessOwner?.id;

  if (!ownerid) return { error: "Unauthorized: ownerId missing" };

  const validation = locationsArraySchema.safeParse(data);
  if (!validation.success)
    return { error: validation.error.issues };
  
  const locations = validation.data;

  const createdLocations = [];

  for (const item of locations) {
    const { city, state, code, countryCode, countryName } = item;

    let country = await Country.findOne({
      where: {
        code: countryCode,
        ownerId: ownerid,
      },
    });
    if (!country) {
      country = await Country.create({
        code: countryCode,
        name: countryName,
        ownerId: ownerid,
      });
    }

    let location = await Location.findOne({
      where: {
        code,
        ownerid,
      },
    });

    if (!location) {
      location = await Location.create({
        city,
        state,
        code,
        ownerId: ownerid,
        countryid: country.id
      });
    }

    createdLocations.push({
      location,
      country,
    });
  }

  return { data: createdLocations };
};

export const getCountries = async (ownerId, pagination) => {
  if (!ownerId) return { error: "ownerId is required" };
  return await countryRepository.list(ownerId, pagination);
};

export const getAllCountries = async () => {
  const countries = await countryRepository.getAll();
  return countries;
};

export const getCountryById = async (id, user) => {
  const ownerid = user?.businessOwnerId;

  const location = await countryRepository.findById(id);
  if (!location) return { notFound: true };

  if (location.ownerId !== ownerid) return { forbidden: true };

  const country = location.country || null;

  return {
    location: location.toJSON(),
    country: country ? country.toJSON() : null,
  };
};

export const searchCountry = async ({ code, country }, user) => {
  const ownerid = user?.businessOwnerId;
  if (!ownerid) return { error: "Unauthorized: ownerId missing" };

  const criteria = {};

  if (code) criteria.code = code.trim();
  if (country) criteria.country = country.trim();

  const results = await countryRepository.search(criteria, ownerid);

  return results;
};

export const updateCountry = async (id, data, ownerId) => {
  const validation = updateLocationSchema.safeParse(data);
  if (!validation.success) return { error: validation.error.issues };

  const location = await countryRepository.findById(id);
  if (!location) return { notFound: true };
  if (location.ownerId !== ownerId) return { unauthorized: true };

  const updatedData = {
    city: validation.data.city,
    state: validation.data.state,
    code: validation.data.code,
    countryId: validation.data.countryId,
  };

  const updatedLocation = await countryRepository.update(id, updatedData);
  return { updated: updatedLocation };
};

export const deleteCountry = async (id, ownerid) => {
  const country = await countryRepository.findById(id);
  if (!country) return { notFound: true };

  try {
    assertOwnerMatch(country.ownerid, ownerid);
  } catch {
    return { unauthorized: true };
  }

  await countryRepository.remove(id);
  return { success: true };
};
