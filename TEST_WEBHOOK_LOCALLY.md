# 🧪 Test Webhook Locally - Debug Payment Issue

## Problem
Payment record shows:
- `subscriptionId`: null ❌
- `status`: "pending" ❌

**Expected:**
- `subscriptionId`: "sub_xxxxx" ✅
- `status`: "success" ✅

---

## Why This Happens

The webhook events from Stripe are NOT reaching your server. This means:
1. Webhook endpoint not configured in Stripe Dashboard
2. Webhook secret mismatch
3. Events not being sent by Stripe

---

## Solution: Test Locally First

### Step 1: Install Stripe CLI

**Windows:**
```bash
scoop install stripe
```

Or download from: https://github.com/stripe/stripe-cli/releases/latest

### Step 2: Login to Stripe
```bash
stripe login
```

### Step 3: Start Your Local Server
```bash
npm run dev
```

### Step 4: Forward Webhooks (New Terminal)
```bash
stripe listen --forward-to http://localhost:5000/api/subscription/webhook
```

**Copy the webhook secret** it shows (starts with `whsec_`)

### Step 5: Update .env
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Restart your server (`npm run dev`)

### Step 6: Create Test Subscription

1. Go to http://localhost:5173
2. Select a plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout

### Step 7: Watch the Logs

**In your server terminal, you should see:**
```
✅ Webhook verified: checkout.session.completed
💳 Payment found: xxxxx
✅ Payment updated: status=success, subscriptionId=sub_xxxxx

✅ Webhook verified: customer.subscription.created
🎉 Subscription created: sub_xxxxx
💳 Payment found: xxxxx
📋 Plan found: Basic
✅ Subscription created in database: xxxxx
```

**In the Stripe CLI terminal, you should see:**
```
2025-11-18 12:00:00   --> checkout.session.completed [evt_xxxxx]
2025-11-18 12:00:01   <-- [200] POST http://localhost:5000/api/subscription/webhook [evt_xxxxx]
2025-11-18 12:00:02   --> customer.subscription.created [evt_xxxxx]
2025-11-18 12:00:03   <-- [200] POST http://localhost:5000/api/subscription/webhook [evt_xxxxx]
```

---

## If Webhooks Are Working Locally

Then the issue is in production (Vercel). You need to:

### 1. Add Webhook Endpoint in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://digital-negotiation-book-server.vercel.app/api/subscription/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. **Copy the signing secret**

### 2. Update Vercel Environment Variable

1. Go to Vercel Dashboard
2. Your project → Settings → Environment Variables
3. Update `STRIPE_WEBHOOK_SECRET` with the new secret
4. **Redeploy** (important!)

### 3. Test Again

Create a new subscription and check:

**Vercel Logs:**
```bash
vercel logs --follow
```

**Stripe Dashboard:**
- Webhooks → Your endpoint → Recent deliveries
- Should show 200 OK

---

## Quick Check: Is Webhook Configured?

Go to: https://dashboard.stripe.com/test/webhooks

**If you see your endpoint:**
- ✅ Configured
- Check "Recent deliveries" for errors

**If you DON'T see your endpoint:**
- ❌ Not configured
- This is why subscriptionId is null!
- Add it now following steps above

---

## Database Query to Check

```sql
-- Check your payment
SELECT 
  id,
  "userId",
  "planId",
  status,
  "subscriptionId",
  "transactionId",
  "createdAt"
FROM payments
WHERE "transactionId" = 'cs_test_a1Qb4eucr0k1B7whLBv8FLnjifBVvluak6GD7K0w3fNRNPtIlrgplsml2A';

-- If subscriptionId is null, webhook never ran
-- If status is pending, webhook never ran
```

---

## Manual Fix for Existing Payment

If you want to manually update the existing payment:

```sql
-- First, find the subscription ID from Stripe Dashboard
-- Then update the payment:

UPDATE payments
SET 
  "subscriptionId" = 'sub_xxxxx', -- Replace with actual subscription ID
  status = 'success',
  "updatedAt" = NOW()
WHERE "transactionId" = 'cs_test_a1Qb4eucr0k1B7whLBv8FLnjifBVvluak6GD7K0w3fNRNPtIlrgplsml2A';
```

But this is just a workaround. You MUST configure webhooks properly!

---

## Summary

**The issue is:** Webhooks are not configured or not working

**The solution:**
1. Test locally with Stripe CLI first
2. Configure webhook endpoint in Stripe Dashboard
3. Update webhook secret in Vercel
4. Redeploy

**After fixing, future subscriptions will work automatically!**
