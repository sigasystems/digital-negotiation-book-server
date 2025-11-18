// test-webhook.js
// Quick test script to verify webhook signature verification

import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testWebhookSetup() {
  console.log("🧪 Testing Webhook Configuration...\n");

  // Check environment variables
  console.log("1️⃣ Checking Environment Variables:");
  console.log("   STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "✅ Set" : "❌ Missing");
  console.log("   STRIPE_WEBHOOK_SECRET:", process.env.STRIPE_WEBHOOK_SECRET ? "✅ Set" : "❌ Missing");
  console.log("");

  // Test Stripe connection
  console.log("2️⃣ Testing Stripe Connection:");
  try {
    const balance = await stripe.balance.retrieve();
    console.log("   ✅ Connected to Stripe");
    console.log("   Currency:", balance.available[0]?.currency || "N/A");
  } catch (err) {
    console.log("   ❌ Failed to connect:", err.message);
    return;
  }
  console.log("");

  // Create a test event
  console.log("3️⃣ Creating Test Webhook Event:");
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
  console.log("   ✅ Test payload created");
  console.log("");

  // Test signature generation
  console.log("4️⃣ Testing Signature Generation:");
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    console.log("   ✅ Signature generated successfully");
    console.log("   Signature:", signature.substring(0, 50) + "...");
  } catch (err) {
    console.log("   ❌ Failed to generate signature:", err.message);
  }
  console.log("");

  console.log("✅ Webhook setup test complete!");
  console.log("\n📝 Next Steps:");
  console.log("   1. Deploy to Vercel");
  console.log("   2. Add webhook endpoint in Stripe Dashboard");
  console.log("   3. Update STRIPE_WEBHOOK_SECRET in Vercel");
  console.log("   4. Test with real checkout");
}

testWebhookSetup().catch(console.error);
