import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {Country} from "../models/index.js";

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

  return await Country.findAndCountAll({
    where: { ownerId },
    limit: Number(pageSize),
    offset: Number(offset),
    order: [[sequelize.fn("LOWER", sequelize.col("name")), "ASC"]],
  });
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

export default {
  findByNameOrCode,
  create,
  findAllByName,
  findAll,
  list,
  createMany,
  findExisting
};
