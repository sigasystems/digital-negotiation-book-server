import { Country } from "../models/index.js";
import { Op } from "sequelize";

export const findByCodeOrCountry = async (code, country, ownerid) => {
  return await Country.findOne({
    where: {
      ownerid,
      [Op.or]: [{ code }, { country }]
    }
  });
};

export const create = async (data) => {
  return await Country.create(data);
};

export const list = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  return await Country.findAndCountAll({
    limit: Number(limit),
    offset: Number(offset),
    order: [["country", "ASC"]],
  });
};

export const search = async (term) => {
  return await Country.findAll({
    where: {
      [Op.or]: [
        { country: { [Op.iLike]: `%${term}%` } },
        { code: { [Op.iLike]: `%${term}%` } },
      ],
    },
    order: [["country", "ASC"]],
  });
};

export const findById = async (id) => {
  return await Country.findByPk(id);
};

export const findConflict = async (id, data) => {
  return await Country.findOne({
    where: {
      id: { [Op.ne]: id },
      [Op.or]: [{ code: data.code }, { country: data.country }],
    },
  });
};

export const update = async (id, data) => {
  await Country.update(data, { where: { id } });
  return await Country.findByPk(id);
};

export const remove = async (id) => {
  return await Country.destroy({ where: { id } });
};

export const createMany = async (countries) => {
  return Country.bulkCreate(countries, { returning: true });
}

export const findExisting = async (codes, countries, ownerid) => {
  return await Country.findAll({
    where: {
      ownerid,
      [Op.or]: [
        { code: { [Op.in]: codes } },
        { country: { [Op.in]: countries } }
      ]
    },
    attributes: ["code", "country"]
  });
};
