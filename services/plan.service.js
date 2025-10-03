import { PlanRepository } from "../repositories/plan.repository.js";
import { createPlanSchema, updatePlanSchema } from "../validations/plan.validation.js";

export const PlanService = {
  createPlan: async (data) => {
    const parsed = createPlanSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map(e => e.message).join(", "));
    }

    const existing = await PlanRepository.findByKey(parsed.data.key);
    if (existing) {
      throw new Error(`Plan with key "${parsed.data.key}" already exists.`);
    }

    return await PlanRepository.create(parsed.data);
  },

  getPlans: async () => {
    return await PlanRepository.findAll();
  },

  getPlanById: async (id) => {
    const plan = await PlanRepository.findById(id);
    if (!plan) throw new Error("Plan not found");
    return plan;
  },

  updatePlan: async (id, data) => {
    const parsed = updatePlanSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map(e => e.message).join(", "));
    }

    const updatedRows = await PlanRepository.update(id, parsed.data);
    if (updatedRows === 0) throw new Error("Plan not found");

    return await PlanRepository.findById(id);
  },

  deletePlan: async (id) => {
    const deletedRows = await PlanRepository.delete(id);
    if (deletedRows === 0) throw new Error("Plan not found");
    return true;
  },

  togglePlanStatus: async (id) => {
    const plan = await PlanRepository.findById(id);
    if (!plan) throw new Error("Plan not found");

    plan.isActive = !plan.isActive;
    await plan.save();

    return plan;
  },
};
