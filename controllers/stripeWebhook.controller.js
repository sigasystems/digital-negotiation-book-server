import Stripe from "stripe";
import { PlanRepository } from "../repositories/plan.repository.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// ✅ Webhook handler (must use raw body middleware)
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, 
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    switch (event.type) {
      // First-time subscription
      case "checkout.session.completed": {
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        await PlanRepository.upsertSubscription({
          userId: session.metadata.userId,
          planId: session.metadata.planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          startDate: new Date(subscription.start_date * 1000),
          endDate: new Date(subscription.current_period_end * 1000),
        });
        break;
      }
      // Stripe auto renewals
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        await PlanRepository.markPaid(invoice.subscription);
        break;
      }
      // Subscription canceled (manually or failed payment)
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await PlanRepository.markCanceled(subscription.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error processing webhook event:", err);
    res.sendStatus(500);
  }
};