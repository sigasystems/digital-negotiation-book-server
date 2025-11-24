    import { errorResponse } from "../handlers/responseHandler.js";
    import Plan from "../models/plan.model.js";
    import UserPlanUsage from "../models/UserPlanUsage.js";

    export const checkPlanLimit = (type) => {
      return async (req, res, next) => {
        try {
          const userId = req.user?.id || req.body.userId;

          if (!userId) {
            return errorResponse(res, 400, "User ID is required");
          }

          const usage = await UserPlanUsage.findOne({ where: { userId } });
          if (!usage) {
            return errorResponse(res, 404, "Usage record not found for user");
          }


          // ✅ Check if planKey exists
          const planKey = usage.planKey;
          if (!planKey) { 
            return errorResponse(res, 404, "User does not have a plan assigned");
          }

          const plan = await Plan.findOne({ where: { key: planKey } });
          if (!plan) {
            return errorResponse(res, 404, "Plan not found for user");
          }

          const column = `used${type.charAt(0).toUpperCase() + type.slice(1)}s`;
          const maxColumn = `max${type.charAt(0).toUpperCase() + type.slice(1)}s`;

          if (usage[column] >= plan[maxColumn]) {
            return errorResponse(res, 403, `Limit reached for ${type}`);
          }

          usage[column] += 1;
          usage.lastUpdated = new Date();
          await usage.save();

          next();
        } catch (error) {
          return errorResponse(res, 500, error.message);
        }
      };
    };
    