import { z } from "zod";
import { paymentRepository } from "../repositories/payment.repository.js";
import { paymentSchema } from "../validations/payment.validation.js";
import formatTimestamps from "../utlis/formatTimestamps.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import userRepository from "../repositories/user.repository.js";
import { Pool } from "pg";
import buyersRepository from "../repositories/buyers.repository.js";

export const paymentService = {
  
  createPayment: async ({ isStripe, planId, userId, manualData }) => {
    planId = String(planId).trim();
    userId = String(userId).trim();

    if (isStripe) {
      if (!planId || !userId)
        throw {
          statuscode: 400,
          message: "planId and userId are required for Stripe payment",
        };

      const user = await userRepository.findById(userId);
      const plan = await PlanRepository.findById(planId);
      if (!user || !plan)
        throw { statuscode: 404, message: "User or Plan not found" };

      const amount =
        plan.billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
      if (!amount || amount <= 0)
        throw {
          statuscode: 400,
          message: "Plan price must be greater than zero",
        };

      const stripeInterval = plan.billingCycle === "monthly" ? "month" : "year";

      const payment = await paymentRepository.createPayment({
        userId: user.id,
        planId: plan.id,
        amount,
        statuscode: "pending",
        transactionId: `pending_${Date.now()}`,
        paymentMethod: "card",
      });

      const stripeProduct = await paymentRepository.createStripeProduct(
        plan.name,
        { planId: plan.id, userId: user.id }
      );
      const stripePrice = await paymentRepository.createStripePrice(
        amount,
        plan.currency || "usd",
        stripeInterval,
        stripeProduct.id
      );

      const session = await paymentRepository.createStripeSession({
        email: user.email,
        priceId: stripePrice.id,
        paymentId: payment.id,
        planId: plan.id,
      });

      return {
        checkoutUrl: session.url,
        statusCode: session.statusCode,
        payment: formatTimestamps(payment.toJSON()),
      };
    }

    // Manual Payment Flow
    const parsed = paymentSchema.safeParse(manualData);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw { statuscode: 400, message: "Validation Error", errors };
    }

    const session = await paymentRepository.createStripeSession({
  email: user.email,
  priceId: stripePrice.id,
  paymentId: payment.id,
  planId: plan.id,
});

// ✅ Add this block right here
try {
  const emailHtml = `
    <p>Hi ${user.firstName},</p>
    <p>Thank you for starting the purchase of the ${plan.name} plan.</p>
    <p>You can complete your payment by clicking the button below:</p>
    ${emailLoginButton({ url: session.url, label: "Complete Payment" })}
    <p>Best regards,<br/>Your Company Team</p>
  `;

  await emailService.sendMail({
    to: user.email,
    subject: `Complete your ${plan.name} subscription`,
    html: emailHtml,
  });

} catch (err) {
  console.error("Failed to send payment email:", err);
}

return {
  checkoutUrl: session.url,
  statusCode: session.statusCode,
  payment: formatTimestamps(payment.toJSON()),
};


    const payment = await paymentRepository.createPayment(parsed.data);
    return formatTimestamps(payment.toJSON());
  },

  getAllPayments: async () => {
    const payments = await paymentRepository.getAllPayments();
    return payments.map((p) => {
      const obj = p.toJSON();
      obj.createdAt = new Date(obj.createdAt).toISOString();
      obj.updatedAt = new Date(obj.updatedAt).toISOString();
      return obj;
    });
  },

  getPaymentById: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };

    const obj = payment.toJSON();
    obj.createdAt = new Date(obj.createdAt).toISOString();
    obj.updatedAt = new Date(obj.updatedAt).toISOString();
    return obj;
  },

  updatePaymentstatuscode: async (id, statuscode) => {
    const statuscodeSchema = z.enum([
      "pending",
      "success",
      "failed",
      "canceled",
    ]);
    const parsed = statuscodeSchema.safeParse(statuscode);
    if (!parsed.success)
      throw { statuscode: 400, message: "Invalid payment statuscode" };

    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };

    await paymentRepository.updatePaymentstatuscode(payment, parsed.data);

    const obj = payment.toJSON();
    obj.createdAt = new Date(obj.createdAt).toISOString();
    obj.updatedAt = new Date(obj.updatedAt).toISOString();
    return obj;
  },

  deletePayment: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };

    await paymentRepository.deletePayment(payment);
    return { id };
  },

  searchStripePayments: async ({ email, statuscode }) => {
    const charges = (await paymentRepository.listStripeCharges()).data;

    const filtered = charges.filter(
      (c) =>
        (!email || c.billing_details.email === email) &&
        (!statuscode || c.statuscode === statuscode)
    );

    return filtered.map((c) => ({
      customer_name: c.billing_details.name,
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      statuscode: c.statuscode,
      customer_email: c.billing_details.email,
      description: c.description,
      created: new Date(c.created * 1000),
      payment_method: c.payment_method_details?.type,
    }));
  },
};
