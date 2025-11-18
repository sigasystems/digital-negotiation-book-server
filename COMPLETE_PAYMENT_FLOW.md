# 💳 Complete Payment Flow - Step by Step

## 🎯 Overview

```
User fills form → Click "Complete Purchase" → Payment created (pending)
    ↓
User redirected to Stripe → User pays
    ↓
Stripe sends webhook → Payment updated (success + subscriptionId)
    ↓
Stripe sends webhook → Subscription created
    ↓
User redirected back → Can access features ✅
```

---

## 📝 Detailed Flow

### **Step 1: User Fills Form and Clicks "Complete Purchase"**

**User provides:**
- Email
- Business Name
- Registration Number
- Plan selection
- Billing cycle (monthly/yearly)

**Frontend calls:**
```javascript
POST /api/subscription/create-checkout-session
{
  "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
  "planId": "f06f0a6d-3bd0-4e28-86ba-53ee1f237c18",
  "billingCycle": "monthly"
}
```

---

### **Step 2: Backend Creates Payment Record (PENDING)**

**In `routes/subscription.route.js`:**

```javascript
// Create Stripe checkout session
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer_email: user.email,
  line_items: [...],
  metadata: {
    userId: user.id,
    planId: plan.id,
    billingCycle: "monthly"
  },
  success_url: "https://dnb.sigasystems.com/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://dnb.sigasystems.com/cancel"
});

// 🔴 CREATE PAYMENT RECORD WITH STATUS: PENDING
await Payment.create({
  userId: user.id,
  planId: plan.id,
  amount: 2999.00,
  status: "pending",              // ⚠️ PENDING
  transactionId: session.id,      // cs_test_xxxxx
  subscriptionId: null,           // ⚠️ NULL (not yet available)
  invoicePdf: null                // ⚠️ NULL (only for renewals)
});
```

**Payment record created:**
```json
{
  "id": "726fc70c-e127-406f-8243-726537bf023b",
  "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
  "planId": "f06f0a6d-3bd0-4e28-86ba-53ee1f237c18",
  "amount": 2999.00,
  "status": "pending",           // ⚠️ PENDING
  "transactionId": "cs_test_a1Qb4eucr0k1B7whLBv8FLnjifBVvluak6GD7K0w3fNRNPtIlrgplsml2A",
  "subscriptionId": null,        // ⚠️ NULL
  "invoicePdf": null,            // ⚠️ NULL
  "createdAt": "2025-11-18 06:40:22.102+00"
}
```

**Backend responds:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

---

### **Step 3: User Redirected to Stripe Checkout**

**Frontend redirects user to Stripe:**
```javascript
window.location.href = response.url;
```

**User sees Stripe checkout page:**
- Enter card details
- Card: 4242 4242 4242 4242
- Expiry: 12/34
- CVC: 123
- Click "Pay"

---

### **Step 4: User Completes Payment on Stripe**

**Stripe processes payment:**
- Charges card
- Creates subscription in Stripe
- Subscription ID: `sub_1QQxxxxx`

---

### **Step 5: Stripe Sends Webhook #1 - checkout.session.completed**

**Stripe sends to:** `https://digital-negotiation-book-server.vercel.app/api/subscription/webhook`

**Webhook receives:**
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1Qb4eucr0k1B7whLBv8FLnjifBVvluak6GD7K0w3fNRNPtIlrgplsml2A",
      "subscription": "sub_1QQxxxxx",  // ✅ Subscription ID!
      "customer": "cus_xxxxx",
      "payment_status": "paid"
    }
  }
}
```

**Webhook handler in `controllers/stripeWebhook.controller.js`:**

```javascript
case "checkout.session.completed": {
  const session = event.data.object;
  
  // Find payment by transactionId
  const payment = await Payment.findOne({
    where: { transactionId: session.id }
  });
  
  // 🟢 UPDATE PAYMENT: STATUS = SUCCESS, ADD SUBSCRIPTION ID
  await payment.update({
    subscriptionId: session.subscription,  // ✅ Add subscription ID
    status: "success"                      // ✅ Change to success
  });
  
  console.log("✅ Payment updated: status=success, subscriptionId=" + session.subscription);
}
```

**Payment record NOW:**
```json
{
  "id": "726fc70c-e127-406f-8243-726537bf023b",
  "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
  "planId": "f06f0a6d-3bd0-4e28-86ba-53ee1f237c18",
  "amount": 2999.00,
  "status": "success",           // ✅ UPDATED!
  "transactionId": "cs_test_a1Qb4eucr0k1B7whLBv8FLnjifBVvluak6GD7K0w3fNRNPtIlrgplsml2A",
  "subscriptionId": "sub_1QQxxxxx", // ✅ UPDATED!
  "invoicePdf": null,            // Still null (normal for initial payment)
  "updatedAt": "2025-11-18 06:40:38.598+00"
}
```

---

### **Step 6: Stripe Sends Webhook #2 - customer.subscription.created**

**Stripe sends:**
```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_1QQxxxxx",
      "status": "active",
      "current_period_start": 1700000000,
      "current_period_end": 1702592000,
      "customer": "cus_xxxxx"
    }
  }
}
```

**Webhook handler:**

```javascript
case "customer.subscription.created": {
  const stripeSub = event.data.object;
  
  // Find payment by subscriptionId
  const payment = await Payment.findOne({
    where: { subscriptionId: stripeSub.id }
  });
  
  // Get plan details
  const plan = await Plan.findByPk(payment.planId);
  
  // 🟢 CREATE SUBSCRIPTION RECORD
  await Subscription.create({
    userId: payment.userId,
    subscriptionId: stripeSub.id,
    planName: plan.name,
    status: stripeSub.status,        // "active"
    paymentStatus: "paid",
    startDate: new Date(stripeSub.start_date * 1000),
    endDate: new Date(stripeSub.current_period_end * 1000),
    maxUsers: plan.maxUsers,
    maxProducts: plan.maxProducts,
    maxOffers: plan.maxOffers,
    maxBuyers: plan.maxBuyers
  });
  
  console.log("✅ Subscription created in database");
}
```

**Subscription record created:**
```json
{
  "id": "uuid-xxxxx",
  "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
  "subscriptionId": "sub_1QQxxxxx",
  "planName": "Basic",
  "status": "active",
  "paymentStatus": "paid",
  "startDate": "2025-11-18T06:40:00.000Z",
  "endDate": "2025-12-18T06:40:00.000Z",
  "maxUsers": 5,
  "maxProducts": 100,
  "maxOffers": 50,
  "maxBuyers": 100
}
```

---

### **Step 7: User Redirected Back to Frontend**

**Stripe redirects to:**
```
https://dnb.sigasystems.com/success?session_id=cs_test_xxxxx
```

**Frontend can:**
1. Show success message
2. Fetch subscription details
3. Enable premium features

---

## 📊 Database State at Each Step

### After Step 2 (Payment Created):
```sql
-- Payment
status: "pending"
subscriptionId: null
invoicePdf: null

-- Subscription
(does not exist yet)
```

### After Step 5 (Webhook #1):
```sql
-- Payment
status: "success"           ✅ UPDATED
subscriptionId: "sub_xxxxx" ✅ UPDATED
invoicePdf: null            (normal)

-- Subscription
(does not exist yet)
```

### After Step 6 (Webhook #2):
```sql
-- Payment
status: "success"
subscriptionId: "sub_xxxxx"
invoicePdf: null

-- Subscription
subscriptionId: "sub_xxxxx" ✅ CREATED
status: "active"            ✅ CREATED
paymentStatus: "paid"       ✅ CREATED
```

---

## 📋 About `invoicePdf`

### Initial Subscription:
```json
{
  "invoicePdf": null  // ✅ This is NORMAL!
}
```

**Why null?**
- Initial subscription doesn't generate an invoice PDF
- Stripe only creates invoice PDF for **renewal payments**

### Renewal Payment (After 1 Month):

**Stripe sends:** `invoice.payment_succeeded`

**Webhook updates:**
```javascript
case "invoice.payment_succeeded": {
  const invoice = event.data.object;
  
  // Create new payment record for renewal
  await Payment.create({
    userId: subscription.userId,
    planId: subscription.planId,
    amount: invoice.amount_paid / 100,
    status: "success",
    transactionId: invoice.id,
    subscriptionId: invoice.subscription,
    invoicePdf: invoice.invoice_pdf  // ✅ NOW HAS PDF!
  });
}
```

**Renewal payment:**
```json
{
  "status": "success",
  "subscriptionId": "sub_xxxxx",
  "invoicePdf": "https://invoice.stripe.com/i/acct_xxx/test_xxx" // ✅ PDF URL!
}
```

---

## ⚠️ Current Issue

**Your payment is stuck at Step 2:**
```json
{
  "status": "pending",      // ❌ Not updated
  "subscriptionId": null,   // ❌ Not updated
  "invoicePdf": null        // ✅ Normal
}
```

**Why?**
- Webhooks (Step 5 & 6) are NOT running
- Because webhook endpoint NOT configured in Stripe Dashboard

**Solution:**
1. Configure webhook in Stripe Dashboard
2. Update webhook secret in Vercel
3. Redeploy
4. Create NEW subscription to test

---

## ✅ Expected Final State

### Payment Table:
```json
{
  "status": "success",           // ✅
  "subscriptionId": "sub_xxxxx", // ✅
  "invoicePdf": null             // ✅ Normal for initial payment
}
```

### Subscription Table:
```json
{
  "subscriptionId": "sub_xxxxx", // ✅
  "status": "active",            // ✅
  "paymentStatus": "paid",       // ✅
  "startDate": "2025-11-18",     // ✅
  "endDate": "2025-12-18"        // ✅
}
```

---

## 🎯 Summary

**Flow:**
1. User clicks "Complete Purchase" → Payment created (pending, null, null)
2. User pays on Stripe → Stripe processes
3. Webhook #1 → Payment updated (success, sub_xxxxx, null)
4. Webhook #2 → Subscription created
5. User redirected → Can access features

**invoicePdf:**
- Initial payment: `null` ✅ (This is normal!)
- Renewal payment: `"https://..."` ✅ (Has PDF)

**Your issue:**
- Webhooks not configured
- Payment stuck at step 1
- Need to configure webhook endpoint in Stripe Dashboard

**Code is ready!** Just need webhook configuration. 🚀
