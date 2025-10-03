import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { authorizeRoles } from "../utlis/authorizeRoles.js";
import {PlanService} from "../services/plan.service.js";

export const createPlan = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const plan = await PlanService.createPlan(req.body);
    return successResponse(res, 201, "Plan created successfully!", plan);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export const getPlans = asyncHandler(async (req, res) => {
  const plans = await PlanService.getPlans();
  return successResponse(res, 200, "Plans fetched successfully", plans);
});

export const getPlanById = asyncHandler(async (req, res) => {
  try {
    const plan = await PlanService.getPlanById(req.params.id);
    return successResponse(res, 200, "Plan fetched successfully", plan);
  } catch (error) {
    return errorResponse(res, 404, error.message);
  }
});

export const updatePlan = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const updatedPlan = await PlanService.updatePlan(req.params.id, req.body);
    return successResponse(res, 200, "Plan updated successfully", updatedPlan);
  } catch (error) {
    return errorResponse(res, 400, error.message);
  }
});

export const deletePlan = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    await PlanService.deletePlan(req.params.id);
    return successResponse(res, 200, "Plan deleted successfully");
  } catch (error) {
    return errorResponse(res, 404, error.message);
  }
});

export const togglePlanStatus = asyncHandler(async (req, res) => {
  try {
    authorizeRoles(req, ["super_admin"]);
    const plan = await PlanService.togglePlanStatus(req.params.id);
    return successResponse(res, 200, `Plan is now ${plan.isActive ? "active" : "inactive"}`, plan);
  } catch (error) {
    return errorResponse(res, 404, error.message);
  }
});

export default {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};
