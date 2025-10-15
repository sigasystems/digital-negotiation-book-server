import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  const body = req.body || null;

  console.log("Hello");
  if (!body) {
    return res.status(400).send("Missing body");
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    const handlePaymentUpdate = async (paymentId, status, extra = {}) => {
      const payment = await Payment.findByPk(paymentId);
      if (!payment) return;
      payment.status = status;
      if (status === "success") payment.paidAt = new Date();
      if (extra.stripeSubscriptionId)
        payment.stripeSubscriptionId = extra.stripeSubscriptionId;
      await payment.save();
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const transactionId = session.metadata.transactionId;
        if (session.metadata.transactionId) {
          await handlePaymentUpdate(transactionId, "success", {
            stripeSubscriptionId: session.subscription,
          });
        }
        console.log('event type.......',event.type)
        console.log('session ..........',session);
        console.log('transactionId ...........',transactionId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const payment = await Payment.findOne({
          where: { stripeSubscriptionId: invoice.subscription },
        });
        if (payment) {
          payment.status = "success";
          payment.paidAt = new Date();
          await payment.save();
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const payment = await Payment.findOne({
          where: { stripeSubscriptionId: invoice.subscription },
        });
        if (payment) {
          payment.status = "failed";
          await payment.save();
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const payment = await Payment.findOne({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (payment) {
          payment.status = "canceled";
          await payment.save();
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).send("Webhook handler failed");
  }
};
