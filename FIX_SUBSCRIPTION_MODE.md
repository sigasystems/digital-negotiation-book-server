# 🔧 Fix: Checkout Session Mode is "payment" instead of "subscription"

## Problem

Your webhook shows:
```
Mode: payment          ❌ Wrong!
Subscription ID: null  ❌ Wrong!
```

**Expected:**
```
Mode: subscription     ✅ Correct!
Subscription ID: sub_xxxxx ✅ Correct!
```

---

## Root Causes

### Cause 1: Frontend Not Sending Correct Data

**Check your frontend code:**

```javascript
// ❌ WRONG - Missing billingCycle
const response = await fetch('/api/subscription/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    planId: plan.id
    // Missing billingCycle!
  })
});

// ✅ CORRECT - Include billingCycle
const response = await fetch('/api/subscription/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: user.id,
    planId: plan.id,
    billingCycle: 'monthly'  // ✅ Must include this!
  })
});
```

### Cause 2: Plan Price is 0 or null

If plan price is 0, it creates a trial (not subscription):

```javascript
// Check your plan in database
SELECT id, name, "priceMonthly", "priceYearly" FROM plans;

// If priceMonthly or priceYearly is 0 or null:
// Backend will skip subscription creation
```

### Cause 3: Using Wrong Endpoint

**Check frontend is calling:**
```
POST /api/subscription/create-checkout-session  ✅ Correct
```

**NOT:**
```
POST /api/payment/create-checkout-session  ❌ Wrong
```

---

## How to Debug

### Step 1: Check Server Logs

Restart your server and create checkout. Look for:

```
📝 Create checkout session request:
   userId: xxxxx
   planId: xxxxx
   billingCycle: monthly  ← Should show "monthly" or "yearly"

📋 Plan details:
   Name: Basic
   Monthly price: 2999    ← Should NOT be 0
   Yearly price: 29990    ← Should NOT be 0

💳 Creating Stripe session:
   Mode: subscription     ← Should say "subscription"
   Price: 2999
   Interval: month        ← Should say "month" or "year"
   Amount (cents): 299900

✅ Stripe checkout session created: cs_test_xxxxx
   Session mode: subscription  ← Should say "subscription"
   Session subscription: null  ← Will be null initially (normal)
```

### Step 2: Check Frontend Request

**Open browser DevTools → Network tab:**

1. Click "Complete Purchase"
2. Find request to `/create-checkout-session`
3. Check **Request Payload:**

```json
{
  "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
  "planId": "f06f0a6d-3bd0-4e28-86ba-53ee1f237c18",
  "billingCycle": "monthly"  ← Must be present!
}
```

### Step 3: Check Plan in Database

```sql
SELECT 
  id,
  name,
  "priceMonthly",
  "priceYearly",
  currency
FROM plans
WHERE id = 'f06f0a6d-3bd0-4e28-86ba-53ee1f237c18';
```

**Expected:**
```
priceMonthly: 2999 (or any number > 0)
priceYearly: 29990 (or any number > 0)
```

**If 0 or null:**
```
priceMonthly: 0     ❌ This will skip subscription!
priceYearly: null   ❌ This will skip subscription!
```

---

## Solutions

### Solution 1: Fix Frontend Code

**Update your frontend to include billingCycle:**

```javascript
// In your frontend component
const handleSubscribe = async () => {
  try {
    const response = await fetch('/api/subscription/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        planId: selectedPlan.id,
        billingCycle: selectedBillingCycle, // 'monthly' or 'yearly'
      }),
    });

    const data = await response.json();
    
    if (data.url) {
      window.location.href = data.url; // Redirect to Stripe
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Solution 2: Fix Plan Prices

**If plan prices are 0 or null, update them:**

```sql
UPDATE plans
SET 
  "priceMonthly" = 2999,
  "priceYearly" = 29990
WHERE id = 'f06f0a6d-3bd0-4e28-86ba-53ee1f237c18';
```

### Solution 3: Add Default Billing Cycle

**If frontend doesn't send billingCycle, add default in backend:**

```javascript
router.post("/create-checkout-session", async (req, res) => {
  try {
    // Add default if not provided
    const { 
      userId, 
      planId, 
      billingCycle = 'monthly'  // ✅ Default to monthly
    } = req.body;

    console.log("📝 Billing cycle:", billingCycle);
    
    // Rest of code...
  }
});
```

---

## Test Again

### Step 1: Restart Server
```bash
npm run dev
```

### Step 2: Create Subscription

Go to frontend and create subscription.

### Step 3: Check Logs

**Should see:**
```
📝 Create checkout session request:
   billingCycle: monthly  ✅

💳 Creating Stripe session:
   Mode: subscription     ✅
   Interval: month        ✅

✅ Stripe checkout session created
   Session mode: subscription  ✅
```

### Step 4: Check Webhook

**After payment, should see:**
```
✅ Webhook verified: checkout.session.completed
🛒 Checkout session completed: cs_test_xxxxx
   Mode: subscription     ✅ Fixed!
   Subscription ID: sub_xxxxx  ✅ Fixed!
💳 Payment found: xxxxx
✅ Payment updated: status=success, subscriptionId=sub_xxxxx
```

---

## Common Mistakes

### Mistake 1: Not Sending billingCycle
```javascript
// ❌ WRONG
body: JSON.stringify({
  userId: user.id,
  planId: plan.id
})

// ✅ CORRECT
body: JSON.stringify({
  userId: user.id,
  planId: plan.id,
  billingCycle: 'monthly'
})
```

### Mistake 2: Plan Price is 0
```sql
-- ❌ WRONG
priceMonthly: 0

-- ✅ CORRECT
priceMonthly: 2999
```

### Mistake 3: Wrong Endpoint
```javascript
// ❌ WRONG
fetch('/api/payment/create-checkout-session')

// ✅ CORRECT
fetch('/api/subscription/create-checkout-session')
```

---

## Quick Fix

**If you're testing and just want it to work NOW:**

1. **Check what frontend is sending:**
   - Open DevTools → Network
   - Look at request payload
   - Is `billingCycle` present?

2. **If missing, add default in backend:**
   ```javascript
   const billingCycle = req.body.billingCycle || 'monthly';
   ```

3. **Restart server and test again**

---

## Verify Success

**After fixing, you should see:**

### In Server Logs:
```
✅ Stripe checkout session created
   Session mode: subscription  ✅
```

### In Webhook Logs:
```
Mode: subscription     ✅
Subscription ID: sub_xxxxx  ✅
```

### In Database:
```sql
SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT 1;
-- status: 'success'
-- subscriptionId: 'sub_xxxxx'
```

---

**The issue is in your frontend or plan configuration, not the webhook code!** 🎯
