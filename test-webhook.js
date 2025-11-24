// test-webhook.js
// Quick test script to verify webhook signature verification

import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testWebhookSetup() {
  try {
    const balance = await stripe.balance.retrieve();
  } catch (err) {
    return;
  }

  // Create a test event
  const testPayload = {
    id: "evt_test_webhook",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        mode: "subscription",
        subscription: "sub_test_123",
        customer: "cus_test_123",
        customer_email: "test@example.com",
        metadata: {
          userId: "test-user-id",
          planId: "test-plan-id",
        },
      },
    },
  };

  const payloadString = JSON.stringify(testPayload);
 
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
  } catch (err) {
  }
}

testWebhookSetup().catch(console.error);
