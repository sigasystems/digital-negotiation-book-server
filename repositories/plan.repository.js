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
 upsertSubscription: async (data)=> {
    // Create or update user’s plan record
    const { userId, planId,  status, startDate, endDate } = data;

    const existing = await User.findOne({ where: { id } });
    if (existing) {
      await existing.update({ planId,  status, startDate, endDate });
    } else {
      await User.create({ userId, planId,  status, startDate, endDate });
    }
  },

   markPaid : async(subscriptionId) => {
    // const plan = await User.findOne({ where: { subscriptionId: subscriptionId } });
    const plan = await Payment.findOne({ subscriptionId  });
console.log('Plannn......',plan);
    if (plan) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await Payment.update({
        status: subscription.status,
        endDate: new Date(subscription.current_period_end * 1000),
      });
    }
  },
   markCanceled : async(subscriptionId) => {
    await User.update(
      { status: "canceled" },
      { where: {  subscriptionId } }
    );
  },
};
