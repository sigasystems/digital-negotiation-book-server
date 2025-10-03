import  {Plan}  from "../../model/index.js";

export const PlanRepository = {
  create: async (data) => {
    return await Plan.create(data);
  },

  findAll: async () => {
    return await Plan.findAll();
  },

  findById: async (id) => {
    return await Plan.findByPk(id);
  },

  findByKey: async (key) => {
    return await Plan.findOne({ where: { key } });
  },

  update: async (id, data) => {
    const [updatedRows] = await Plan.update(data, {
      where: { id },
      returning: true,
    });
    return updatedRows;
  },

  delete: async (id) => {
    return await Plan.destroy({ where: { id } });
  },
};
