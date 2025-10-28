import { Payment, Plan, User } from "../models/index.js";
import stripe from "../config/stripe.js";

export const paymentRepository = {
  createPayment: (data) => Payment.create(data),
  getAllPayments: () => Payment.findAll({ include: ["User", "Plan"] }),
  getPaymentById: (id) => Payment.findByPk(id, { include: ["User", "Plan"] }),
  updatePaymentStatus: (payment, status) => {
    payment.status = status;
    if (status === "success") payment.paidAt = new Date();
    return payment.save();
  },
  getPaymentByTransactionId: (transactionId) => Payment.findOne({ where: { transactionId } }), 
  deletePayment: (payment) => payment.destroy(),
  getUserById: (id) => User.findByPk(id),
  getPlanById: (id) => Plan.findByPk(id),

  // Stripe
  listStripeCharges: (limit = 100) => stripe.charges.list({ limit }),
  createStripeProduct: (name, metadata) => stripe.products.create({ name, metadata }),
  createStripePrice: (amount, currency, interval, productId) =>
    // stripe.prices.create({
    //   unit_amount: Math.round(amount * 100),
    //   currency,
    //   recurring: { interval },
    //   product: productId,
    // }),
    stripe.prices.create({
  unit_amount: amount * 100,
  currency: "inr",
  recurring: { interval: "month" }, // or "year"
  product: productId,
}) ,
  createStripeSession: ({ email, priceId , userId, paymentId, planId }) =>
    stripe.checkout.sessions.create({

      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // success_url: `http://localhost:5173/paymentsuccess`,
      success_url:'https://digital-negotiation-book-client.vercel.app/paymentsuccess',
      // cancel_url: `https://localhost:5173/`,
      cancel_url:'https://digital-negotiation-book-client.vercel.app/',
      customer_email: email,
      metadata: { paymentId, planId },
      metadata: { paymentId, planId, userId },  
    }),
};
