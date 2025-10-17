import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  var event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
  }


  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

const payment = await Payment.findOne({ where: { transactionId: session.id } });

    if (payment) {
      payment.status = "success";
      payment.stripeSubscriptionId = session.subscription;
      await payment.save();

      const user = await User.findByPk(payment.userId);
      if (user) {
        user.subscriptionStatus = "active";
        await user.save();
      }
    }
  }
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const payment = await Payment.findOne({ where: { stripeSubscriptionId: invoice.subscription } });
    if (payment) {
      payment.status = "failed";
      await payment.save();

      const user = await User.findByPk(payment.userId);
      if (user) {
        user.subscriptionStatus = "inactive";
        await user.save();
      }
    }
  }
  res.json({ received: true });
}