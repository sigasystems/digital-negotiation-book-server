// controllers/stripeWebhook.controller.js

import Stripe from "stripe";
import { Payment } from "../models/index.js";
import Subscription from "../models/subscription.model.js";
import Plan from "../models/plan.model.js";
import User from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripeWebhookController = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  
  // Critical: Log raw body type for debugging
  console.log("📥 Webhook received");
  console.log("   Raw body is Buffer?", Buffer.isBuffer(req.body));
  console.log("   Signature present?", !!sig);
  console.log("   Content-Type:", req.headers["content-type"]);

  if (!sig) {
    console.error("❌ No signature header found");
    return res.status(400).send("Webhook Error: No signature header");
  }

  let event;

  // ------------------------------
  // Verify Stripe Signature
  // ------------------------------
  try {
    // CRITICAL: req.body MUST be a Buffer (raw body)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    console.error("   Body type:", typeof req.body);
    console.error("   Body is Buffer?", Buffer.isBuffer(req.body));
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Webhook verified: ${event.type}`);
  console.log(`   Event ID: ${event.id}`);

  // ------------------------------
  // Handle Webhook Events
  // ------------------------------
  try {
    switch (event.type) {
      // ----------------------------------------------------------
      // CHECKOUT SESSION COMPLETED
      // ----------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("🛒 Checkout session completed:", session.id);
        console.log("   Mode:", session.mode);
        console.log("   Subscription ID:", session.subscription);

        // Only process subscription checkouts
        if (session.mode !== "subscription" || !session.subscription) {
          console.log("⚠️ Not a subscription checkout, skipping");
          break;
        }

        // Find the payment record created during checkout
        const payment = await Payment.findOne({
          where: { transactionId: session.id },
        });

        if (!payment) {
          console.error("❌ Payment record not found for session:", session.id);
          console.error("   This is normal for Stripe CLI test events.");
          console.error("   For real checkouts, payment record must exist.");
          break;
        }

        console.log("💳 Payment found:", payment.id);

        // Update payment with subscription ID and mark as success
        await payment.update({
          subscriptionId: session.subscription,
          status: "success",
        });

        console.log("✅ Payment updated: status=success, subscriptionId=" + session.subscription);
        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION CREATED (This gives us the subscription details)
      // ----------------------------------------------------------
      case "customer.subscription.created": {
        const stripeSub = event.data.object;
        console.log("🎉 Subscription created:", stripeSub.id);
        console.log("   Status:", stripeSub.status);
        console.log("   Customer:", stripeSub.customer);

        // Find payment by subscriptionId
        const payment = await Payment.findOne({
          where: { subscriptionId: stripeSub.id },
        });

        if (!payment) {
          console.error("❌ Payment not found for subscription:", stripeSub.id);
          break;
        }

        console.log("💳 Payment found:", payment.id);

        // Get plan details
        const plan = await Plan.findByPk(payment.planId);
        if (!plan) {
          console.error("❌ Plan not found:", payment.planId);
          break;
        }

        console.log("📋 Plan found:", plan.name);

        // Create subscription record in database
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

        console.log(`✅ Subscription ${created ? "created" : "updated"} in database:`, subscription.id);
        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION UPDATED
      // ----------------------------------------------------------
      case "customer.subscription.updated": {
        const stripeSub = event.data.object;
        console.log("🔄 Subscription updated:", stripeSub.id);
        console.log("   New status:", stripeSub.status);

        const subscription = await Subscription.findOne({
          where: { subscriptionId: stripeSub.id },
        });

        if (subscription) {
          await subscription.update({
            status: stripeSub.status,
            endDate: new Date(stripeSub.current_period_end * 1000),
          });
          console.log("✅ Subscription status updated:", stripeSub.status);
        } else {
          console.log("⚠️ Subscription not found in database:", stripeSub.id);
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
        } else {
          console.log("⚠️ Subscription not found in database:", stripeSub.id);
        }

        break;
      }

      // ----------------------------------------------------------
      // INVOICE PAYMENT SUCCEEDED (Renewals)
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
          console.log("✅ Subscription renewed until:", new Date(stripeSub.current_period_end * 1000));
        } else {
          console.error("❌ Subscription not found:", subscriptionId);
        }

        // Create or update payment record for renewal
        const [payment, paymentCreated] = await Payment.findOrCreate({
          where: { transactionId: invoice.id },
          defaults: {
            userId: subscription?.userId,
            planId: subscription ? await getPlanIdFromSubscription(subscription) : null,
            amount: invoice.amount_paid / 100,
            status: "success",
            transactionId: invoice.id,
            subscriptionId: subscriptionId,
            invoicePdf: invoice.invoice_pdf,
          },
        });

        if (!paymentCreated) {
          await Payment.update({
            status: "success",
            invoicePdf: invoice.invoice_pdf,
          });
        }

        console.log(`✅ Payment ${paymentCreated ? "created" : "updated"} for renewal`);
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

        // Create or update payment record
        const [payment, paymentCreated] = await Payment.findOrCreate({
          where: { transactionId: invoice.id },
          defaults: {
            userId: subscription?.userId,
            planId: subscription ? await getPlanIdFromSubscription(subscription) : null,
            amount: invoice.amount_due / 100,
            status: "failed",
            transactionId: invoice.id,
            subscriptionId: subscriptionId,
          },
        });

        if (!paymentCreated) {
          await payment.update({
            status: "failed",
          });
        }

        console.log("❌ Payment marked as failed");
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
    console.error("   Error message:", err.message);
    console.error("   Stack trace:", err.stack);
    
    // Still return 200 to prevent Stripe from retrying
    return res.status(200).json({ received: true, error: err.message });
  }
};

// Helper function to get planId from subscription
async function getPlanIdFromSubscription(subscription) {
  try {
    const plan = await Plan.findOne({
      where: { name: subscription.planName },
    });
    return plan?.id || null;
  } catch (err) {
    console.error("Error getting planId:", err);
    return null;
  }
}

export default stripeWebhookController;
