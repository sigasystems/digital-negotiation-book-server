import express from "express";
import  stripe  from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import Plan from "../models/plan.model.js";


const router = express.Router();

// Create Stripe Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, planId, billingCycle } = req.body;
    console.log("Payload received:", req.body);

    // 1️⃣ Fetch user
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Fetch plan
    const plan = await Plan.findByPk(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // 3️⃣ Validate billingCycle
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ message: "Invalid billing cycle" });
    }

    // 4️⃣ Convert billingCycle to Stripe interval
    const stripeInterval = billingCycle === "monthly" ? "month" : "year";

    // 5️⃣ Convert price to cents
    const price = billingCycle === "yearly" ? plan.priceYearly * 100 : plan.priceMonthly * 100;
    if (!price || price <= 0) {
      return res.status(400).json({ message: "Invalid plan price" });
    }

    // 6️⃣ Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: plan.currency || "usd",
            product_data: { name: plan.name },
            unit_amount: Math.round(price),
            recurring: { interval: stripeInterval }, // ✅ Corrected
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    console.log("Stripe session created:", session.id);

    // 7️⃣ Save Payment
    await Payment.create({
      userId: user.id,
      planId: plan.id,
      amount: price / 100,
      status: "pending",
      transactionId: session.id,
      stripeSubscriptionId: session.subscription,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Error in create-checkout-session:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});





export default router;
