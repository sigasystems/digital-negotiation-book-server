import { Plan, UserPlanUsage } from "../models/index.js";

export const getPlanUsage = async (req, res) => {
  try {
    const userId = req.params.id;

    const usage = await UserPlanUsage.findOne({ where: { userId } });
    if (!usage) {
    }

    const plan = await Plan.findOne({ where: { key: usage.planKey } });
    if (!plan) {
    }

    // Build a structured usage response
    const response = {
      planKey: plan.key,

      buyers: {
        used: usage.usedBuyers,
        max: plan.maxBuyers,
        remaining: plan.maxBuyers - usage.usedBuyers,
      },
      products: {
        used: usage.usedProducts,
        max: plan.maxProducts,
        remaining: plan.maxProducts - usage.usedProducts,
      },
      offers: {
        used: usage.usedOffers,
        max: plan.maxOffers,
        remaining: plan.maxOffers - usage.usedOffers,
      },
      locations: {
        used: usage.usedLocations,
        max: plan.maxLocations,
        remaining: plan.maxLocations - usage.usedLocations,
      },
    };

    res.status(200).json({ success: true, data: response });
  } catch (error) {
  }
};
