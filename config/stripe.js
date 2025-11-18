import dotenv from "dotenv";
dotenv.config(); // ✅ must come before Stripe init
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

export default stripe;
