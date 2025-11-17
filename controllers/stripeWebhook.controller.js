// controllers/stripeWebhook.controller.js

import Stripe from "stripe";
import { PlanRepository } from "../repositories/plan.repository.js";
import Payment from "../models/payment.model.js";
import Subscription from "../models/subscription.model.js"; // if exists

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripeWebhookController = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  console.log("Is raw body a buffer?", Buffer.isBuffer(req.body));

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
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`➡️ Webhook received: ${event.type}`);

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

        // Only process if the checkout mode is subscription
        if (session.mode !== "subscription") {
          console.log("Skipping non-subscription checkout session.");
          break;
        }

        console.log("Subscription checkout session:", session);

        const subscriptionId = session.subscription;

        if (!subscriptionId) {
          console.error("No subscription id in checkout session.");
          break;
        }

        // Retrieve subscription object from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await PlanRepository.upsertSubscription({
          userId: session.metadata.userId,
          planId: session.metadata.planId,
          stripeCustomerId: session.customer,
          status: subscription.status,
          startDate: new Date(subscription.start_date * 1000),
          endDate: new Date(subscription.current_period_end * 1000),
        });

        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION RENEWAL PAYMENT
      // ----------------------------------------------------------
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        if (!invoice.subscription) {
          console.log("Skipping invoice without subscription:", invoice.id);
          break;
        }

        const subscriptionId = invoice.subscription;

        await PlanRepository.markPaid(subscriptionId);

        // Update payment record
        await Payment.update(
          {
            status: "success",
            invoicePdf: invoice.invoice_pdf,
          },
          { where: { transactionId: invoice.id } }
        );

        // Fetch subscription to update its end period
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

        await Subscription.update(
          {
            status: stripeSub.status,
            endDate: new Date(stripeSub.current_period_end * 1000),
          },
          { where: { subscriptionId } }
        );

        break;
      }

      // ----------------------------------------------------------
      // SUBSCRIPTION CANCELLED OR PAYMENT FAILED
      // ----------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await PlanRepository.markCanceled(subscription.id);
        break;
      }

      // ----------------------------------------------------------
      // DEFAULT (IGNORE)
      // ----------------------------------------------------------
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return res.sendStatus(500);
  }
};

export default stripeWebhookController;
