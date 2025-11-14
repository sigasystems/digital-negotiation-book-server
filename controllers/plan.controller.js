import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import { asyncHandler } from "../handlers/asyncHandler.js";
import { authorizeRoles } from "../utlis/helper.js";
import {PlanService} from "../services/plan.service.js";
import Payment from "../models/payment.model.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import stripe from "../config/stripe.js";
import User from "../models/user.model.js";

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
// ✅ Check current plan
export const checkPlanByOwner = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;

    if (!userId) return errorResponse(res, 400, "User ID missing");

    const result = await PlanService.checkPlanService(userId);
    return successResponse(res, 200, result);
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, err.message || "Error checking plan status");
  }
};
// ✅ Upgrade or renew plan
export const upgradeOrRenewPlan = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { planId, billingCycle = "monthly" } = req.body;

    if (!userId || !planId) 
      return errorResponse(res, 400, "Missing required data");

    // Call service (no res object here)
    const result = await PlanService.upgradeOrRenewPlan(userId, planId, billingCycle);

    return successResponse(res, 200, {
      message: "Subscription session created successfully",
      ...result,
    });
  } catch (err) {
    console.error("Upgrade or renew plan error:", err);
    return errorResponse(res, 500, err.message || "Error creating subscription session");
  }
};
// ✅ Handle payment success (webhook/manual)
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return errorResponse(res, 400, "Missing sessionId");

    const message = await PlanService.handlePaymentSuccessService(sessionId);
    return successResponse(res, 200, message);
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, err.message || "Error finalizing payment");
  }
};

export default {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  togglePlanStatus,
};
