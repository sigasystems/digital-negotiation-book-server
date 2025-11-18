# 🚀 Vercel Deployment Fix - Step by Step

## ⚠️ Current Issue
Stripe webhooks are failing with signature verification errors in production (Vercel).

## ✅ What We Fixed
1. **Webhook Controller** - Complete rewrite with proper error handling
2. **Payment Model** - Added userId field
3. **Checkout Session** - Added metadata for tracking
4. **Event Handling** - All subscription lifecycle events covered

---

## 📋 Deployment Checklist

### Step 1: Commit and Push Changes ✅

```bash
git add .
git commit -m "Fix Stripe webhook signature verification and event handling"
git push origin main
```

Wait for Vercel to auto-deploy (check Vercel dashboard).

---

### Step 2: Get New Webhook Secret from Stripe 🔑

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"** (or edit existing)
3. Enter webhook URL:
   ```
   https://your-vercel-domain.vercel.app/api/subscription/webhook
   ```
   Replace `your-vercel-domain` with your actual Vercel domain

4. Select **API version**: `2025-09-30.clover` (or latest)

5. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

6. Click **"Add endpoint"**

7. **COPY THE SIGNING SECRET** (starts with `whsec_`)
   - This is different from your previous secret!
   - You'll need this in the next step

---

### Step 3: Update Vercel Environment Variables 🔧

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `STRIPE_WEBHOOK_SECRET`
5. Click **Edit**
6. Paste the NEW signing secret from Step 2
7. Click **Save**

**IMPORTANT:** After saving, you MUST redeploy!

---

### Step 4: Redeploy Application 🔄

Option A - Via Vercel Dashboard:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**
4. Select **"Use existing Build Cache"** (faster)
5. Click **"Redeploy"**

Option B - Via CLI:
```bash
vercel --prod
```

---

### Step 5: Test the Webhook 🧪

#### Test 1: Create a Test Subscription

1. Go to your frontend: `https://your-frontend-domain.com`
2. Login and select a plan
3. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. Complete the checkout

#### Test 2: Check Vercel Logs

```bash
vercel logs --follow
```

Look for these logs:
```
✅ Webhook verified: checkout.session.completed
📦 Stripe subscription retrieved: sub_xxxxx
✅ Payment updated to success
✅ Subscription created: xxxxx
```

#### Test 3: Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint
3. Check **"Recent deliveries"**
4. Latest event should show:
   - Status: `200 OK`
   - Response: `{"received":true}`

#### Test 4: Check Database

```sql
-- Check payment
SELECT id, "userId", "planId", status, "transactionId", "subscriptionId", "createdAt"
FROM payments
ORDER BY "createdAt" DESC
LIMIT 1;

-- Check subscription
SELECT id, "userId", "subscriptionId", "planName", status, "paymentStatus", "startDate", "endDate"
FROM subscriptions
ORDER BY "createdAt" DESC
LIMIT 1;
```

Expected results:
- Payment: `status = 'success'`, `subscriptionId` should be populated
- Subscription: `status = 'active'`, `paymentStatus = 'paid'`

---

## 🔍 Troubleshooting

### Issue: Still getting "Webhook signature verification failed"

**Causes:**
1. Old webhook secret still in Vercel
2. Didn't redeploy after updating env var
3. Wrong webhook URL in Stripe

**Solutions:**
1. Double-check the webhook secret in Vercel matches Stripe
2. Redeploy the application
3. Verify webhook URL is exactly: `https://your-domain.vercel.app/api/subscription/webhook`

---

### Issue: Webhook returns 200 but subscription not created

**Check Vercel logs for errors:**
```bash
vercel logs --follow
```

**Common causes:**
1. Database connection issue
2. Missing Plan record
3. Missing User record
4. Database schema mismatch

**Solutions:**
1. Check database connection in Vercel logs
2. Verify Plan exists: `SELECT * FROM plans WHERE id = 'your-plan-id'`
3. Verify User exists: `SELECT * FROM "Users" WHERE id = 'your-user-id'`
4. Run migrations: `npm run migrate`

---

### Issue: Payment created but status still "pending"

**Cause:** Webhook not being triggered or failing

**Solutions:**
1. Check Stripe webhook logs for delivery status
2. Verify webhook endpoint is active in Stripe Dashboard
3. Check Vercel function logs for errors
4. Manually trigger webhook from Stripe Dashboard (click "Send test webhook")

---

## 🎯 Success Criteria

✅ Webhook endpoint shows "Active" in Stripe Dashboard
✅ Test subscription completes successfully
✅ Payment record shows `status: 'success'`
✅ Subscription record shows `status: 'active'`
✅ Vercel logs show no errors
✅ Stripe webhook logs show 200 responses

---

## 📞 Still Having Issues?

1. **Check Vercel Function Logs:**
   ```bash
   vercel logs --follow
   ```

2. **Check Stripe Webhook Logs:**
   - Go to Stripe Dashboard → Webhooks
   - Click on your endpoint
   - View "Recent deliveries"
   - Check response body and status

3. **Test Locally First:**
   ```bash
   npm run test:webhook
   npm run dev
   ```
   Then use Stripe CLI:
   ```bash
   stripe listen --forward-to http://localhost:5000/api/subscription/webhook
   stripe trigger checkout.session.completed
   ```

4. **Verify Environment Variables:**
   - `STRIPE_SECRET_KEY` - Should start with `sk_test_` or `sk_live_`
   - `STRIPE_WEBHOOK_SECRET` - Should start with `whsec_`
   - Both should be set in Vercel

---

## 📝 Quick Reference

**Webhook URL:**
```
https://your-domain.vercel.app/api/subscription/webhook
```

**Test Card:**
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: 12345
```

**Stripe Dashboard:**
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Subscriptions: https://dashboard.stripe.com/test/subscriptions
- Payments: https://dashboard.stripe.com/test/payments

**Vercel Dashboard:**
- Deployments: https://vercel.com/dashboard
- Logs: `vercel logs --follow`
- Env Vars: Settings → Environment Variables
