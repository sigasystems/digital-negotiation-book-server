import { Payment, Plan, Subscription, User } from "../models/index.js";

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
getSubscriptionByUser : async (userId) => {
  return await Subscription.findOne({ where: { userId } });
},
getPlanById : async (planId) => {
  return await Plan.findByPk(planId);
},
createPayment : async (paymentData) => {
  return await Payment.create(paymentData);
},
 getPaymentBySession : async (sessionId) => {
  return await Payment.findOne({ where: { sessionId } });
},
async upsertSubscription(data) {
    // Create or update user’s plan record
    const { userId, planId, stripeCustomerId, stripeSubscriptionId, status, startDate, endDate } = data;

    const existing = await User.findOne({ where: { userId } });
    if (existing) {
      await existing.update({ planId, stripeCustomerId, stripeSubscriptionId, status, startDate, endDate });
    } else {
      await User.create({ userId, planId, stripeCustomerId, stripeSubscriptionId, status, startDate, endDate });
    }
  },

  async markPaid(subscriptionId) {
    const plan = await User.findOne({ where: { stripeSubscriptionId: subscriptionId } });
    if (plan) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await plan.update({
        status: subscription.status,
        endDate: new Date(subscription.current_period_end * 1000),
      });
    }
  },
  async markCanceled(subscriptionId) {
    await User.update(
      { status: "canceled" },
      { where: { stripeSubscriptionId: subscriptionId } }
    );
  },
};
