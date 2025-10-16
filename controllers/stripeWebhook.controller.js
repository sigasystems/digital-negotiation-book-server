import stripe from "../config/stripe.js";
import Payment from "../models/payment.model.js";

export const stripeWebhook = async (req, res) => {
   console.log("comes in webhook.....")
  const sig = req.headers["stripe-signature"];
  var event;
  console.log("req body........", req.body)
  console.log("log sig ............", sig );
  console.log("stripe webhook..........",process.env.STRIPE_WEBHOOK_SECRET)
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("event log", event)
  } catch (err) {
    console.log("error in catch blcok",err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
  }


  console.log("event type..........", event.type)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("Incoming webhook session id:", session.id);
const payment = await Payment.findOne({ where: { transactionId: session.id } });
console.log("Payment found:", payment);

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