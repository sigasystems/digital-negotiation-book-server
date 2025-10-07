import { z } from "zod";
import { paymentRepository } from "../repositories/payment.repository.js";
import { paymentSchema } from "../validations/payment.validation.js";
import formatTimestamps from "../utlis/formatTimestamps.js";

export const paymentService = {
  createPayment: async ({ isStripe, planId, userId, manualData }) => {
    if (isStripe) {
      if (!planId || !userId) throw { status: 400, message: "planId and userId are required for Stripe payment" };

      const user = await paymentRepository.getUserById(userId);
      const plan = await paymentRepository.getPlanById(planId);
      if (!user || !plan) throw { status: 404, message: "User or Plan not found" };

      const amount = plan.billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
      if (!amount || amount <= 0) throw { status: 400, message: "Plan price must be greater than zero" };

      const stripeInterval = plan.billingCycle === "monthly" ? "month" : "year";

      const payment = await paymentRepository.createPayment({
        userId: user.id,
        planId: plan.id,
        amount,
        status: "pending",
        transactionId: `pending_${Date.now()}`,
        paymentMethod: "card",
      });

      const stripeProduct = await paymentRepository.createStripeProduct(plan.name, { planId: plan.id, userId: user.id });
      const stripePrice = await paymentRepository.createStripePrice(amount, plan.currency || "usd", stripeInterval, stripeProduct.id);
      const session = await paymentRepository.createStripeSession({ email: user.email, priceId: stripePrice.id, paymentId: payment.id, planId: plan.id });

      return { checkoutUrl: session.url, payment: formatTimestamps(payment.toJSON()) };
    }

    const parsed = paymentSchema.safeParse(manualData);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(e => ({ field: e.path.join("."), message: e.message }));
      throw { status: 400, message: "Validation Error", errors };
    }

    const payment = await paymentRepository.createPayment(parsed.data);
    return formatTimestamps(payment.toJSON());
  },

  getAllPayments: async () => {
    const payments = await paymentRepository.getAllPayments();
    return payments.map(p => {
      const obj = p.toJSON();
      obj.createdAt = new Date(obj.createdAt).toISOString();
      obj.updatedAt = new Date(obj.updatedAt).toISOString();
      return obj;
    });
  },

  getPaymentById: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { status: 404, message: "Payment not found" };

    const obj = payment.toJSON();
    obj.createdAt = new Date(obj.createdAt).toISOString();
    obj.updatedAt = new Date(obj.updatedAt).toISOString();
    return obj;
  },

  updatePaymentStatus: async (id, status) => {
    const statusSchema = z.enum(["pending", "success", "failed", "canceled"]);
    const parsed = statusSchema.safeParse(status);
    if (!parsed.success) throw { status: 400, message: "Invalid payment status" };

    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { status: 404, message: "Payment not found" };

    await paymentRepository.updatePaymentStatus(payment, parsed.data);

    const obj = payment.toJSON();
    obj.createdAt = new Date(obj.createdAt).toISOString();
    obj.updatedAt = new Date(obj.updatedAt).toISOString();
    return obj;
  },

  deletePayment: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { status: 404, message: "Payment not found" };

    await paymentRepository.deletePayment(payment);
    return { id };
  },

  searchStripePayments: async ({ email, status }) => {
    const charges = (await paymentRepository.listStripeCharges()).data;

    const filtered = charges.filter(c =>
      (!email || c.billing_details.email === email) &&
      (!status || c.status === status)
    );

    return filtered.map(c => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      status: c.status,
      customer_email: c.billing_details.email,
      description: c.description,
      created: new Date(c.created * 1000),
      payment_method: c.payment_method_details?.type,
    }));
  },
};
