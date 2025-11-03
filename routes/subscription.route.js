import express from "express";
import  stripe  from "../config/stripe.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import Plan from "../models/plan.model.js";

const router = express.Router();

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { userId, planId, billingCycle } = req.body;

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

    // 5️⃣ Determine price
    const price =
      billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

    // 6️⃣ Handle free (trial) plan directly
    if (!price || Number(price) <= 0) {
      const payment = await Payment.create({
        userId: user.id,
        planId: plan.id,
        amount: 0,
        status: "success",
        transactionId: `TRIAL-${Date.now()}`,
        stripeSubscriptionId: null,
        remarks: "Trial plan activated",
      });

      return res.json({
        message: "Trial plan activated successfully",
        trial: true,
        paymentId: payment.id,
      });
    }

    // 7️⃣ Create Stripe session for paid plan
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: plan.currency?.toLowerCase() || "inr",
            product_data: { name: plan.name },
            unit_amount: Math.round(Number(price) * 100),
            recurring: { interval: stripeInterval },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    // 8️⃣ Save payment as pending
    await Payment.create({
      userId: user.id,
      planId: plan.id,
      amount: Number(price),
      status: "pending",
      transactionId: session.id,
      stripeSubscriptionId: session.subscription || null,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Error in create-checkout-session:", err);
    res
      .status(500)
      .json({ message: "Server Error", error: err.message });
  }
});





export default router;
