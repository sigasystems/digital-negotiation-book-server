import { z } from "zod";
import { paymentRepository } from "../repositories/payment.repository.js";
import { paymentSchema } from "../validations/payment.validation.js";
import formatTimestamps from "../utlis/formatTimestamps.js";
import { PlanRepository } from "../repositories/plan.repository.js";
import userRepository from "../repositories/user.repository.js";
import transporter from "../config/nodemailer.js";

export const paymentService = {
  createPayment: async ({ isStripe, planId, userId, manualData }) => {
    planId = String(planId).trim();
    userId = String(userId).trim();

    // Stripe Payment Flow
    if (isStripe) {
      if (!planId || !userId)
        throw { statuscode: 400, message: "planId and userId are required for Stripe payment" };

      // fetch user and plan
      const user = await userRepository.findById(userId);
      const plan = await PlanRepository.findById(planId);
      console.log('userid and planid from payment service....',user , plan);
      if (!user || !plan)
        throw { statuscode: 404, message: "User or Plan not found" };

      const amount = plan.billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
      console.log('amount......', amount);
      if (!amount || amount <= 0)
        throw { statuscode: 400, message: "Plan price must be greater than zero" };

      const stripeInterval = plan.billingCycle === "monthly" ? "month" : "year";

      // Create payment row in DB
      const payment = await paymentRepository.createPayment({
        userId: user.id,
        planId: plan.id,
        amount,
        statuscode: "pending",
        transactionId: `pending_${Date.now()}`,
        paymentMethod: "card",
      });
      console.log('payment.....',payment);

      // Create Stripe Product & Price
      const stripeProduct = await paymentRepository.createStripeProduct(plan.name, {
        planId: plan.id,
        userId: user.id,
      });
      console.log('stripe product.....',stripeProduct)

      const stripePrice = await paymentRepository.createStripePrice(
        amount,
        plan.currency || "USD",
        stripeInterval,
        stripeProduct.id
      );

      if (!stripePrice || !stripePrice.id)
        throw { statuscode: 500, message: "Stripe Price creation failed" };
      // Create Checkout Session
      const session = await paymentRepository.createStripeSession({
        email: user.email,
        priceId: stripePrice.id,
        paymentId: payment.id,
        planId: plan.id,
        userId,
      });
      // ✅ Send email notification
      try {
        const emailHtml = `
          <p>Hi ${user.firstName},</p>
          <p>Thank you for starting the purchase of the ${plan.name} plan.</p>
          <p>You can complete your payment by clicking the button below:</p>
          <a href="${session.url}" style="background:#007bff;color:#fff;padding:10px 15px;border-radius:4px;text-decoration:none;">Complete Payment</a>
          <p>Best regards,<br/>Your Company Team</p>
        `;
        await transporter.sendMail({
          to: user.email,
          subject: `Complete your ${plan.name} subscription`,
          html: emailHtml,
        });
      } catch (err) {
        console.error("Failed to send payment email:", err);
      }

      return {
        checkoutUrl: session.url,
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

    const manualPayment = await paymentRepository.createPayment(parsed.data);
    return formatTimestamps(manualPayment.toJSON());
  },

  getAllPayments: async () => {
    const payments = await paymentRepository.getAllPayments();
    return payments.map((p) => formatTimestamps(p.toJSON()));
  },

  getPaymentById: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };
    return formatTimestamps(payment.toJSON());
  },

  updatePaymentstatuscode: async (id, statuscode) => {
    const statuscodeSchema = z.enum(["pending", "success", "failed", "canceled"]);
    const parsed = statuscodeSchema.safeParse(statuscode);
    if (!parsed.success) throw { statuscode: 400, message: "Invalid payment statuscode" };

    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };

    await paymentRepository.updatePaymentStatus(payment, parsed.data);
    return formatTimestamps(payment.toJSON());
  },

  deletePayment: async (id) => {
    const payment = await paymentRepository.getPaymentById(id);
    if (!payment) throw { statuscode: 404, message: "Payment not found" };
    await paymentRepository.deletePayment(payment);
    return { id };
  },

  searchStripePayments: async ({ email, statuscode }) => {
    const charges = (await paymentRepository.listStripeCharges()).data;
    return charges
      .filter(
        (c) =>
          (!email || c.billing_details.email === email) &&
          (!statuscode || c.statuscode === statuscode)
      )
      .map((c) => ({
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
