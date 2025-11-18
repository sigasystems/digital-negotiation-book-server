import { updateCountrySchema } from "../validations/country.schema.js";
import countryRepository from "../repositories/country.repository.js";
import { locationsArraySchema } from "../validations/location.validation.js";
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

export const getCountries = async (ownerid, { pageIndex = 0, pageSize = 10 }) => {
  const { count, rows } = await countryRepository.list(ownerid,{
    pageIndex,
    pageSize,
  });

  const formatted = rows.map((c) => c.toJSON());

  const totalItems = count;
  const totalPages = Math.ceil(totalItems / pageSize);

  const totalActive = formatted.filter((x) => x.status === "active" && !x.isDeleted).length;
  const totalInactive = formatted.filter((x) => x.status === "inactive" && !x.isDeleted).length;
  const totalDeleted = formatted.filter((x) => x.isDeleted === true).length;

  return {
    data: formatted,
    totalItems,
    totalPages,
    totalActive,
    totalInactive,
    totalDeleted,
    pageIndex,
    pageSize,
  };
};

export const getCountryById = async (id, user) => {
  const ownerid = user?.businessOwnerId;

  const country = await countryRepository.findById(id);
  if (!country) return { notFound: true };

  try {
    assertOwnerMatch(country.ownerid, ownerid);
  } catch {
    return { unauthorized: true };
  }

  return { country };
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

export const updateCountry = async (id, data, ownerid) => {
  const validation = updateCountrySchema.safeParse(data);
  if (!validation.success) return { error: validation.error.issues };

  const country = await countryRepository.findById(id);
  if (!country) return { notFound: true };

  try {
    assertOwnerMatch(country.ownerid, ownerid);
  } catch {
    return { unauthorized: true };
  }

  const exists = await countryRepository.findConflict(id, validation.data, ownerid);
  if (exists) return { conflict: exists };

  const updated = await countryRepository.update(id, validation.data);
  return { updated };
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
