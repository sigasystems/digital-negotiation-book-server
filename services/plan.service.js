import transporter from "../config/nodemailer.js";
import stripe from "../config/stripe.js";
import { getPlanById } from "../controllers/plan.controller.js";
import { errorResponse, successResponse } from "../handlers/responseHandler.js";
import Plan from "../models/plan.model.js";
import User from "../models/user.model.js";
import { paymentRepository } from "../repositories/payment.repository.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import userRepository from "../repositories/user.repository.js";
import { emailLoginButton } from "../utlis/emailTemplate.js";
import { createPlanSchema, updatePlanSchema } from "../validations/plan.validation.js";

export const PlanService = {
  createPlan: async (data) => {
    // validate input
    const parsed = createPlanSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map(e => e.message).join(", "));
    }

    // check if plan with same key exists
    const existing = await PlanRepository.findByKey(parsed.data.key);
    if (existing) {
      throw new Error(`Plan with key "${parsed.data.key}" already exists.`);
    }

    // get Stripe price details
    let monthlyAmount = 0;
    let yearlyAmount = 0;
    data.priceMonthlyId = data.stripePriceMonthlyId;
data.priceYearlyId = data.stripePriceYearlyId;
    if (data.stripePriceMonthlyId) {
      const monthlyPrice = await stripe.prices.retrieve(data.stripePriceMonthlyId);
      monthlyAmount = monthlyPrice.unit_amount / 100;
      data.currency = monthlyPrice.currency.toUpperCase();
    }
    if (data.stripePriceYearlyId) {
      const yearlyPrice = await stripe.prices.retrieve(data.stripePriceYearlyId);
      yearlyAmount = yearlyPrice.unit_amount / 100;
    }
    data.priceMonthly = monthlyAmount;
    data.priceYearly = yearlyAmount;
    // create plan in DB
    const plan = await PlanRepository.create(data);
    return plan;
  },
  
  createCheckoutSession: async (userId, planId, billingCycle) => {
  const user = await userRepository.findById(userId);
  const plan = await PlanRepository.findById(planId);
  if (!user || !plan) throw new Error("User or Plan not found");
  const priceId =
    billingCycle === "yearly"
      ? plan.stripePriceYearlyId
      : plan.stripePriceMonthlyId;
  if (!priceId) throw new Error("Stripe price ID missing for this plan");
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
    });
    stripeCustomerId = customer.id;
    await userRepository.update(user.id, { stripeCustomerId });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cancel`,
    metadata: { userId, planId, billingCycle },
  });
  return { url: session.url };
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

  checkPlanService : async (userId) => {
  const subscription = await PlanRepository.getSubscriptionByUser(userId);

  if (!subscription) return { hasPlan: false };

  const today = new Date();
  const endDate = new Date(subscription.endDate);
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  return {
    hasPlan: true,
    planName: subscription.planName,
    planStatus: subscription.status,
    endDate,
    daysLeft,
    paymentStatus: subscription.paymentStatus,
    isExpiringSoon: daysLeft <= 5,
    limits: {
      maxUsers: subscription.maxUsers,
      maxProducts: subscription.maxProducts,
      maxOffers: subscription.maxOffers,
      maxBuyers: subscription.maxBuyers,
    },
  };
  },

  upgradeOrRenewPlan : async (userId, planId, billingCycle = "monthly") => {
  try {
    // 1️⃣ Fetch plan
    const plan = await Plan.findByPk(planId);
    if (!plan) throw new Error("Plan not found");

    // 2️⃣ Determine Stripe priceId
    const priceId = billingCycle === "yearly" ? plan.stripePriceYearlyId : plan.stripePriceMonthlyId;
    console.log('price id....', priceId);
    if (!priceId) throw new Error(`Stripe prsice ID missing for ${billingCycle} plan`);

    // 3️⃣ Fetch user
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    // 4️⃣ Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customerId in DB
      await user.update({ stripeCustomerId: customerId });
    }

    // 5️⃣ Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }], // ✅ must pass valid price ID
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/`,
      metadata: { userId, planId, billingCycle },
    });

    // 6️⃣ Return session details to frontend
    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (err) {
    console.error("Error in upgradeOrRenewPlan:", err);
    throw err;
  }
  },

  handlePaymentSuccessService : async (sessionId) => {
  const payment = await PlanRepository.getPaymentBySession(sessionId);
  if (!payment) throw new Error("Payment not found");

  payment.paymentStatus = "paid";
  await payment.save();

  const plan = await PlanRepository.getPlanById(payment.planId);
  if (!plan) throw new Error("Plan not found for payment");

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1); // Example: 1 month validity

  await PlanRepository.upsertSubscription({
    userId: payment.userId,
    subscriptionId: sessionId,
    planName: plan.name,
    status: "active",
    startDate,
    endDate,
    maxUsers: plan.maxUsers,
    maxProducts: plan.maxProducts,
    maxOffers: plan.maxOffers,
    maxBuyers: plan.maxBuyers,
    paymentStatus: "paid",
  });
  return "Plan upgraded successfully";
  }
};
