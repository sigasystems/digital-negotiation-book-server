# Stripe Webhook Setup Guide

## ✅ What Was Fixed

### 1. **Webhook Controller** (`controllers/stripeWebhook.controller.js`)
- ✅ Proper signature verification with detailed error logging
- ✅ Complete event handling for all subscription lifecycle events
- ✅ Proper database updates for Payment and Subscription models
- ✅ Added comprehensive logging for debugging
- ✅ Handles all edge cases (missing data, failed lookups, etc.)
- ✅ Returns 200 status to prevent Stripe retries on processing errors

### 2. **Checkout Session** (`routes/subscription.route.js`)
- ✅ Added metadata (userId, planId, billingCycle) to Stripe session
- ✅ Improved logging for debugging

### 3. **Payment Model** (`models/payment.model.js`)
- ✅ Added userId field with proper foreign key reference
- ✅ Removed unique constraint from subscriptionId (allows multiple payments per subscription)

### 4. **Events Handled**
- ✅ `checkout.session.completed` - Initial subscription creation
- ✅ `invoice.payment_succeeded` - Renewal payments
- ✅ `invoice.payment_failed` - Failed payments
- ✅ `customer.subscription.updated` - Status changes
- ✅ `customer.subscription.deleted` - Cancellations

---

## 🚀 Deployment Steps

### Step 1: Deploy to Vercel

```bash
# Commit your changes
git add .
git commit -m "Fix Stripe webhook implementation"
git push origin main
```

Vercel will auto-deploy if connected to your repo.

### Step 2: Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://your-domain.vercel.app/api/subscription/webhook
   ```
4. Select these events to listen to:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)

### Step 3: Update Environment Variables

In Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret
3. Click **Save**
4. **Redeploy** your application

---

## 🧪 Testing

### Test 1: Create Subscription
1. Go to your frontend
2. Select a plan and complete checkout
3. Use Stripe test card: `4242 4242 4242 4242`
4. Check Vercel logs for:
   ```
   ✅ Webhook verified: checkout.session.completed
   ✅ Subscription created
   ✅ Payment updated to success
   ```

### Test 2: Check Database
```sql
-- Check payment record
SELECT * FROM payments WHERE status = 'success' ORDER BY "createdAt" DESC LIMIT 1;

-- Check subscription record
SELECT * FROM subscriptions WHERE status = 'active' ORDER BY "createdAt" DESC LIMIT 1;
```

### Test 3: Simulate Webhook (Local Testing)

Install Stripe CLI:
```bash
stripe listen --forward-to http://localhost:5000/api/subscription/webhook
```

Trigger test event:
```bash
stripe trigger checkout.session.completed
```

---

## 🔍 Debugging

### Check Vercel Logs
```bash
vercel logs --follow
```

### Check Stripe Webhook Logs
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Click on your webhook endpoint
3. View **Recent deliveries**
4. Check response status and body

### Common Issues

#### Issue: "Webhook signature verification failed"
**Solution:** 
- Ensure `STRIPE_WEBHOOK_SECRET` is correct in Vercel
- Redeploy after updating env vars
- Check that webhook route uses `express.raw({ type: "application/json" })`

#### Issue: "Payment record not found"
**Solution:**
- Ensure checkout session creates payment record BEFORE redirecting
- Check that `transactionId` matches `session.id`

#### Issue: "Subscription not created"
**Solution:**
- Check that `checkout.session.completed` event is being received
- Verify Plan model has all required fields (maxUsers, maxProducts, etc.)
- Check database logs for constraint violations

---

## 📋 Checklist

- [ ] Code deployed to Vercel
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` updated in Vercel
- [ ] Application redeployed after env var update
- [ ] Test subscription created successfully
- [ ] Payment record shows `status: 'success'`
- [ ] Subscription record shows `status: 'active'`
- [ ] Webhook logs show 200 responses in Stripe Dashboard

---

## 🎯 Expected Flow

1. **User clicks "Subscribe"**
   → Frontend calls `/api/subscription/create-checkout-session`
   → Payment record created with `status: 'pending'`
   → User redirected to Stripe Checkout

2. **User completes payment**
   → Stripe sends `checkout.session.completed` webhook
   → Webhook verifies signature
   → Payment updated to `status: 'success'`
   → Subscription record created with plan details

3. **Subscription renews**
   → Stripe sends `invoice.payment_succeeded` webhook
   → Subscription `endDate` updated
   → Payment status updated

4. **Subscription cancelled**
   → Stripe sends `customer.subscription.deleted` webhook
   → Subscription `status` updated to 'canceled'

---

## 📞 Support

If issues persist:
1. Check Vercel function logs
2. Check Stripe webhook delivery logs
3. Verify database schema matches model definitions
4. Ensure all environment variables are set correctly
