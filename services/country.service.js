import { countryArraySchema, updateCountrySchema } from "../validations/country.schema.js";
import * as countryRepository from "../repositories/country.repository.js";

const assertOwnerMatch = (recordOwnerId, userOwnerId) => {
  if (!recordOwnerId || !userOwnerId) {
    throw new Error("Unauthorized: owner information missing");
  }

  if (recordOwnerId !== userOwnerId) {
    throw new Error("Forbidden: You do not own this resource");
  }
};

export const createCountry = async (data, user) => {
  const ownerid = user?.businessOwnerId;
  if (!ownerid) return { error: "Unauthorized: ownerId missing" };

  const validation = countryArraySchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues };
  }

  const countriesToCreate = validation.data;

  const codeSet = new Set();
  const countrySet = new Set();
  const internalDuplicates = [];

  for (const item of countriesToCreate) {
    if (codeSet.has(item.code)) internalDuplicates.push({ type: "code", value: item.code });
    if (countrySet.has(item.country)) internalDuplicates.push({ type: "country", value: item.country });

    codeSet.add(item.code);
    countrySet.add(item.country);
  }

  if (internalDuplicates.length > 0) {
    return {
      conflict: internalDuplicates.map(d => 
        d.type === "code" 
          ? `Duplicate code in request: ${d.value}` 
          : `Duplicate country in request: ${d.value}`
      )
    };
  }

  const codes = countriesToCreate.map(c => c.code);
  const names = countriesToCreate.map(c => c.country);

  const existing = await countryRepository.findExisting(codes, names, ownerid);

  if (existing.length > 0) {
    const conflicts = existing.map(e => 
      `Already exists → code: ${e.code}, country: ${e.country}`
    );
    return { conflict: conflicts };
  }

  const payload = countriesToCreate.map(c => ({
    ...c,
    ownerid,
  }));

  const created = await countryRepository.createMany(payload);
  return { created };
};

export const getCountries = async (query, ownerid) => {
  return countryRepository.list(query, ownerid);
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

export const searchCountry = async (query, ownerid) => {
  const { term = "" } = query;
  return countryRepository.search(term.trim(), ownerid);
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
