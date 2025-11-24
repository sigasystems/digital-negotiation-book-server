import Subscription from "../models/subscription.model.js";

const checkPlanValidity = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user.",
      });
    }

    // Fetch the latest active subscription for this user
    const subscription = await Subscription.findOne({
      where: { userId: user.id, status: "active" },
      order: [["endDate", "DESC"]],
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "NO_ACTIVE_SUBSCRIPTION",
        message: "No active subscription found. Please purchase a plan.",
      });
    }

    const today = new Date();
    const endDate = new Date(subscription.endDate);

    if (today >= endDate) {
      return res.status(403).json({
        success: false,
        code: "PLAN_EXPIRED",
        message: `Your subscription expired on ${endDate.toISOString()}. Please renew.`,
      });
    }

    // Attach subscription info to request if needed downstream
    req.subscription = subscription;

    next();
  } catch (err) {
    console.error("Plan Validity Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error validating subscription.",
    });
  }
};
  
export default checkPlanValidity;
