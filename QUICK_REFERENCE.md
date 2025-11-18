# 🚀 Quick Reference - Stripe Webhook

## Deploy in 3 Steps

### 1️⃣ Deploy Code
```bash
git add . && git commit -m "Fix webhook" && git push
```

### 2️⃣ Configure Stripe
- URL: `https://digital-negotiation-book-server.vercel.app/api/subscription/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy signing secret

### 3️⃣ Update Vercel
- Settings → Environment Variables
- Update `STRIPE_WEBHOOK_SECRET`
- Redeploy

---

## Test Card
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: 12345
```

---

## Check Logs
```bash
vercel logs --follow
```

**Look for:**
```
✅ Webhook verified: checkout.session.completed
✅ Payment updated: status=success
✅ Webhook verified: customer.subscription.created
✅ Subscription created in database
```

---

## Verify Database
```sql
-- Payment should have subscriptionId and status=success
SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT 1;

-- Subscription should exist with status=active
SELECT * FROM subscriptions ORDER BY "createdAt" DESC LIMIT 1;
```

---

## Event Flow
```
checkout.session.completed
  → Update payment (subscriptionId, status=success)

customer.subscription.created
  → Create subscription record

invoice.payment_succeeded
  → Handle renewals

invoice.payment_failed
  → Mark as past_due

customer.subscription.updated
  → Sync status

customer.subscription.deleted
  → Mark as canceled
```

---

## Troubleshooting

**Signature Error?**
- Update webhook secret in Vercel
- Redeploy

**Subscription Not Created?**
- Check Vercel logs
- Verify Plan exists
- Check database connection

**Payment Still Pending?**
- Check Stripe webhook logs
- Verify events are being sent
- Check webhook endpoint is active

---

## Success Checklist
- [ ] Deployed to Vercel
- [ ] Webhook added in Stripe
- [ ] Secret updated in Vercel
- [ ] Redeployed
- [ ] Test subscription works
- [ ] Payment status = success
- [ ] Subscription status = active
- [ ] No errors in logs

---

## Documentation
- `FINAL_DEPLOYMENT_STEPS.md` - Complete deployment guide
- `CHANGES_SUMMARY.md` - What was changed and why
- `STRIPE_WEBHOOK_SETUP.md` - Detailed setup instructions
- `VERCEL_DEPLOYMENT_FIX.md` - Troubleshooting guide
