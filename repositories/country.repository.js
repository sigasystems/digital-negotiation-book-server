import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {Country, Location} from "../models/index.js";

const findByNameOrCode = async ({ name, code, ownerId }) => {
  return await Country.findOne({
    where: {
      ownerId,
      [Op.or]: [{ name }, { code }],
    },
  });
};

const create = async (data) => {
  return await Country.create(data);
};

const findAllByName = async (search, ownerId) => {
  return await Country.findAll({
    where: {
      ownerId,
      name: { [Op.iLike]: `%${search}%` },
    },
    order: [[sequelize.fn("LOWER", sequelize.col("name")), "ASC"]],
  });
};

const findAll = async (ownerId) => {
  return await Country.findAll({
    where: { ownerId },
    order: [[sequelize.fn("LOWER", sequelize.col("name")), "ASC"]],
  });
};

const list = async (ownerId, { pageIndex = 0, pageSize = 10 }) => {
  const offset = pageIndex * pageSize;

  const { count, rows } = await Location.findAndCountAll({
    where: { ownerId },
    limit: Number(pageSize),
    offset: Number(offset),
    order: [[sequelize.fn("LOWER", sequelize.col("city")), "ASC"]],
    include: [
      {
        model: Country,
        as: "country", 
        attributes: ["id", "name", "code"],
      },
    ],
  });

  const formatted = rows.map((r) => r.toJSON());

  const totalItems = count;
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    data: formatted,
    totalItems,
    totalPages,
    pageIndex,
    pageSize,
  };
};

const createMany = async (countries) => {
  return Country.bulkCreate(countries, { returning: true });
}

const findExisting = async (codes, names, ownerid) => {
  return await Country.findAll({
    where: {
      ownerid,
      [Op.or]: [
        { code: { [Op.in]: codes } },
        { name: { [Op.in]: names } }
      ]
    },
    attributes: ["code", "name"]
  });
};

const findById = async (id) => {
  if (!id) return null;

  const location = await Location.findOne({
    where: { id },
    include: [
      {
        model: Country,
        as: "country",
        attributes: ["id", "name", "code"],
      },
    ],
  });

  return location;
};

const getAll = async () => {
  return await Country.findAll({
    attributes: ["id", "name", "code"],
    order: [["name", "ASC"]],
  });
};

const update = async (id, data) => {
  await Location.update(data, { where: { id } });
  return await findById(id);
};

const removeLocationsByCity = async (cityName) => {
  return await Location.destroy({
    where: { city: cityName },
  });
};

const search = async ({ city, state, country }, ownerId) => {
  if (!ownerId) throw new Error("ownerId missing");

  const orConditions = [];
  if (city) orConditions.push({ city: { [Op.iLike]: `%${city}%` } });
  if (state) orConditions.push({ state: { [Op.iLike]: `%${state}%` } });

  const countryWhere = country
    ? { name: { [Op.iLike]: `%${country}%` } }
    : null;
  const results = await Location.findAll({
    where: {
      ownerId,
      ...(orConditions.length > 0 ? { [Op.or]: orConditions } : {}),
    },
    include: [
      {
        model: Country,
        as: "country",
        attributes: ["id", "name", "code"],
        ...(countryWhere ? { where: countryWhere, required: true } : {}),
      },
    ],
  });

  return results.map((r) => r.toJSON());
};

const removeLocationById = async (id) => {
  return await Location.destroy({
    where: { id },
  });
};

const findLocationById = async (id) => {
  return await Location.findOne({ where: { id } });
};

export default {
  findByNameOrCode,
  create,
  findAllByName,
  findAll,
  list,
  createMany,
  findExisting,
  findById,
  getAll,
  update,
  search,
  removeLocationsByCity,
  findLocationById,
  removeLocationById
};
