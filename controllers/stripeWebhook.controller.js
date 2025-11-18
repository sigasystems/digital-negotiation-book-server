// controllers/stripeWebhook.controller.js

import Stripe from "stripe";
import { PlanRepository } from "../repositories/plan.repository.js";
import Payment from "../models/payment.model.js";
import Subscription from "../models/subscription.model.js";
import Plan from "../models/plan.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripeWebhookController = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  // Log for debugging
  console.log("📥 Webhook received");
  console.log("Is raw body a buffer?", Buffer.isBuffer(req.body));
  console.log("Signature present?", !!sig);

  let event;

  // ------------------------------
  // Verify Stripe Signature
  // ------------------------------
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Webhook verified: ${event.type}`);

  // ------------------------------
  // Handle Webhook Events
  // ------------------------------
  try {
    switch (event.type) {
      // ----------------------------------------------------------
      // SUBSCRIPTION CHECKOUT SUCCESS
      // ----------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("🛒 Checkout session completed:", session.id);

        // Only process if the checkout mode is subscription
        if (session.mode !== "subscription" || !session.subscription) {
          console.log("⚠️ Not a subscription checkout, skipping");
          break;
        }

        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const customerEmail = session.customer_details?.email || session.customer_email;

        console.log("📋 Subscription ID:", subscriptionId);
        console.log("👤 Customer ID:", customerId);

        // Retrieve full subscription details from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        console.log("📦 Stripe subscription retrieved:", stripeSub.id);

        // Find the payment record created during checkout
        const payment = await Payment.findOne({
          where: { transactionId: session.id },
        });

        if (!payment) {
          console.error("❌ Payment record not found for session:", session.id);
          break;
        }

        console.log("💳 Payment found:", payment.id);

        // Update payment with subscription ID and mark as success
        await payment.update({
          subscriptionId: stripeSub.id,
          status: "success",
        });

        console.log("✅ Payment updated to success");

        // Get plan details
        const plan = await Plan.findByPk(payment.planId);
        if (!plan) {
          console.error("❌ Plan not found:", payment.planId);
          break;
        }

        // Create or update subscription record
        const [subscription, created] = await Subscription.findOrCreate({
          where: { subscriptionId: stripeSub.id },
          defaults: {
            userId: payment.userId,
            subscriptionId: stripeSub.id,
            planName: plan.name,
            status: stripeSub.status,
            paymentStatus: "paid",
            startDate: new Date(stripeSub.start_date * 1000),
            endDate: new Date(stripeSub.current_period_end * 1000),
            maxUsers: plan.maxUsers || 0,
            maxProducts: plan.maxProducts || 0,
            maxOffers: plan.maxOffers || 0,
            maxBuyers: plan.maxBuyers || 0,
          },
        });

        if (!created) {
          await subscription.update({
            status: stripeSub.status,
            paymentStatus: "paid",
            startDate: new Date(stripeSub.start_date * 1000),
            endDate: new Date(stripeSub.current_period_end * 1000),
          });
        }

        console.log(`✅ Subscription ${created ? "created" : "updated"}:`, subscription.id);
        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION RENEWAL PAYMENT SUCCESS
      // ----------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("💰 Invoice payment succeeded:", invoice.id);

        if (!invoice.subscription) {
          console.log("⚠️ Invoice without subscription, skipping");
          break;
        }

        const subscriptionId = invoice.subscription;

        // Retrieve subscription from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        console.log("📦 Subscription retrieved for renewal:", stripeSub.id);

        // Update subscription record
        const subscription = await Subscription.findOne({
          where: { subscriptionId },
        });

        if (subscription) {
          await subscription.update({
            status: stripeSub.status,
            paymentStatus: "paid",
            endDate: new Date(stripeSub.current_period_end * 1000),
          });
          console.log("✅ Subscription renewed:", subscription.id);
        } else {
          console.error("❌ Subscription not found:", subscriptionId);
        }

        // Update payment record if exists
        const payment = await Payment.findOne({
          where: { transactionId: invoice.id },
        });

        if (payment) {
          await payment.update({
            status: "success",
            invoicePdf: invoice.invoice_pdf,
          });
          console.log("✅ Payment record updated");
        }

        break;
      }

      // ----------------------------------------------------------
      // INVOICE PAYMENT FAILED
      // ----------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("❌ Invoice payment failed:", invoice.id);

        if (!invoice.subscription) {
          console.log("⚠️ Invoice without subscription, skipping");
          break;
        }

        const subscriptionId = invoice.subscription;

        // Update subscription status
        const subscription = await Subscription.findOne({
          where: { subscriptionId },
        });

        if (subscription) {
          await subscription.update({
            status: "past_due",
            paymentStatus: "unpaid",
          });
          console.log("⚠️ Subscription marked as past_due");
        }

        // Update payment record if exists
        const payment = await Payment.findOne({
          where: { transactionId: invoice.id },
        });

        if (payment) {
          await payment.update({
            status: "failed",
          });
          console.log("❌ Payment marked as failed");
        }

        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION UPDATED
      // ----------------------------------------------------------
      case "customer.subscription.updated": {
        const stripeSub = event.data.object;
        console.log("🔄 Subscription updated:", stripeSub.id);

        const subscription = await Subscription.findOne({
          where: { subscriptionId: stripeSub.id },
        });

        if (subscription) {
          await subscription.update({
            status: stripeSub.status,
            endDate: new Date(stripeSub.current_period_end * 1000),
          });
          console.log("✅ Subscription status updated:", stripeSub.status);
        }

        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION DELETED/CANCELLED
      // ----------------------------------------------------------
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        console.log("🗑️ Subscription deleted:", stripeSub.id);

        const subscription = await Subscription.findOne({
          where: { subscriptionId: stripeSub.id },
        });

        if (subscription) {
          await subscription.update({
            status: "canceled",
            paymentStatus: "unpaid",
          });
          console.log("✅ Subscription marked as canceled");
        }

        break;
      }

      // ----------------------------------------------------------
      // DEFAULT (LOG UNHANDLED EVENTS)
      // ----------------------------------------------------------
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Error processing webhook event:", err);
    console.error("Stack trace:", err.stack);
    
    // Still return 200 to prevent Stripe from retrying
    // Log the error for investigation
    return res.status(200).json({ received: true, error: err.message });
  }
};

export default stripeWebhookController;
