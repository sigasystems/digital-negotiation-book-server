import Stripe from "stripe";
import { Payment, Plan, Subscription } from "../models/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PlanRepository = {
  create: async (data) => Plan.create(data),

  findAll: async () => Plan.findAll(),

  findById: async (id) => Plan.findByPk(id),

  findByKey: async (key) => Plan.findOne({ where: { key } }),

  update: async (id, data) => {
    const [rows] = await Plan.update(data, { where: { id }, returning: true });
    return rows;
  },

  delete: async (id) => Plan.destroy({ where: { id } }),

  getSubscriptionByUser: async (userId) =>
    Subscription.findOne({ where: { userId } }),

  getPlanById: async (planId) => Plan.findByPk(planId),

  createPayment: async (paymentData) => Payment.create(paymentData),

  getPaymentBySession: async (sessionId) =>
    Payment.findOne({ where: { sessionId } }),

  upsertSubscription: async (data) => {
    const { id, userId, planId, status, startDate, endDate, subscriptionId } =
      data;

    const payload = {
      userId,
      planId,
      status,
      startDate,
      endDate,
      subscriptionId,
    };

    if (id) payload.id = id;

    return Subscription.upsert(payload);
  },

  markPaid: async (subscriptionId) => {
    if (!subscriptionId) {
      return;
    }

    try {
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

      const subscriptionRow = await Subscription.findOne({
        where: { subscriptionId },
      });

      if (subscriptionRow) {
        await subscriptionRow.update({
          status: stripeSub.status,
          endDate: new Date(stripeSub.current_period_end * 1000),
        });
      }

      return true;
    } catch (err) {
      console.error("markPaid error:", err.message);
      throw err;
    }
  },

  markCanceled: async (subscriptionId) => {
    return Subscription.update(
      { status: "canceled" },
      { where: { subscriptionId } }
    );
  },
};
