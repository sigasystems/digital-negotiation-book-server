// import Stripe from "stripe";
// import { Payment, Plan, Subscription, User } from "../models/index.js";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const PlanRepository = {
//   create: async (data) => {
//     return await Plan.create(data);
//   },

//   findAll: async () => {
//     return await Plan.findAll();
//   },

//   findById: async (id) => {
//     return await Plan.findByPk(id);
//   },

//   findByKey: async (key) => {
//     return await Plan.findOne({ where: { key } });
//   },

//   update: async (id, data) => {
//     const [updatedRows] = await Plan.update(data, {
//       where: { id },
//       returning: true,
//     });
//     return updatedRows;
//   },

//   delete: async (id) => {
//     return await Plan.destroy({ where: { id } });
//   },
// getSubscriptionByUser : async (userId) => {
//   return await Subscription.findOne({ where: { userId } });
// },
// getPlanById : async (planId) => {
//   return await Plan.findByPk(planId);
// },
// createPayment : async (paymentData) => {
//   return await Payment.create(paymentData);
// },
//  getPaymentBySession : async (sessionId) => {
//   return await Payment.findOne({ where: { sessionId } });
// },
// //  upsertSubscription: async (data)=> {
// //     // Create or update user’s plan record
// //     const { userId, planId,  status, startDate, endDate } = data;

// //     const existing = await User.findOne({ where: { userId } });
// //     console.log('existing user....',existing);
// //     if (existing) {
// //       await existing.update({ planId,  status, startDate, endDate });
// //     } else {
// //       await User.create({ userId, planId,  status, startDate, endDate });
// //     }
// //   },

// upsertSubscription: async (data) => {
//   const { id, userId, planId, status, startDate, endDate, subscriptionId } = data;

//   return await Subscription.upsert({
//     id: id || undefined,            // allows insert or update
//     userId,
//     planId,
//     status,
//     startDate,
//     endDate,
//     subscriptionId
//   });
// },

// //    markPaid : async(subscriptionId) => {
// //     // const plan = await User.findOne({ where: { subscriptionId: subscriptionId } });
// //     const plan = await Payment.findOne({ subscriptionId  });
// // console.log('Plannn......',plan);
// //     if (plan) {

// //      const subscriptionId = event.data.object.subscription;

// // if (!subscriptionId) {
// //   console.log("No subscription ID found in event, skipping");
// //   return res.status(200).send("OK");
// // }
// // const subscription = await stripe.subscriptions.retrieve(subscriptionId);
// //       // const subscription = await stripe.subscriptions.retrieve(subscriptionId);
// //       await Payment.update({
// //         status: subscription.status,
// //         endDate: new Date(subscription.current_period_end * 1000),
// //       });
// //     }
// //   },
   

// markPaid: async (subscriptionId) => {
//   if (!subscriptionId) {
//     console.log("No subscriptionId provided to markPaid");
//     return;
//   }

//   // Retrieve latest Stripe subscription
//   const subscription = await stripe.subscriptions.retrieve(subscriptionId);

//   // Find payment record
//   const plan = await Payment.findOne({ where: { subscriptionId } });
//   console.log("Plan....", plan);

//   if (plan) {
//     await plan.update({
//       status: subscription.status,
//       endDate: new Date(subscription.current_period_end * 1000),
//     });
//   }

//   return true;
// },

//   markCanceled : async(subscriptionId) => {
//     await User.update(
//       { status: "canceled" },
//       { where: {  subscriptionId } }
//     );
//   },
// };


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
      console.log("No subscriptionId provided to markPaid");
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
