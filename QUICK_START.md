# 🚀 Quick Start - Deploy Fixed Webhook

## 1️⃣ Deploy Code (2 minutes)

```bash
# Add all changes
git add .

# Commit with message
git commit -m "Fix Stripe webhook signature verification and event handling"

# Push to trigger Vercel deployment
git push origin main
```

Wait for Vercel to deploy (check dashboard).

---

## 2️⃣ Configure Stripe Webhook (3 minutes)

1. Open: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Paste your URL: `https://YOUR-DOMAIN.vercel.app/api/subscription/webhook`
4. Select these events:
   - checkout.session.completed
   - invoice.payment_succeeded
   - invoice.payment_failed
   - customer.subscription.updated
   - customer.subscription.deleted
5. Click **"Add endpoint"**
6. **COPY the signing secret** (starts with `whsec_`)

---

## 3️⃣ Update Vercel (2 minutes)

1. Open: https://vercel.com/dashboard
2. Go to your project → **Settings** → **Environment Variables**
3. Find `STRIPE_WEBHOOK_SECRET`
4. Click **Edit** → Paste the new secret → **Save**
5. Go to **Deployments** → Click latest → **Redeploy**

---

## 4️⃣ Test (2 minutes)

1. Go to your frontend
2. Select a plan and checkout
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

**Check logs:**
```bash
vercel logs --follow
```

**Look for:**
```
✅ Webhook verified: checkout.session.completed
✅ Subscription created
```

---

## ✅ Done!

Your webhook is now working properly. All subscription events will be handled automatically.

---

## 🆘 If Something Goes Wrong

1. **Check Vercel logs:** `vercel logs --follow`
2. **Check Stripe webhook logs:** Dashboard → Webhooks → Your endpoint → Recent deliveries
3. **Verify webhook secret:** Make sure it matches in both Stripe and Vercel
4. **Redeploy:** Sometimes you need to redeploy after changing env vars

---

## 📚 Full Documentation

- `WEBHOOK_FIX_SUMMARY.md` - What was fixed
- `VERCEL_DEPLOYMENT_FIX.md` - Detailed deployment steps
- `STRIPE_WEBHOOK_SETUP.md` - Complete setup guide

---

**Total Time: ~10 minutes**
