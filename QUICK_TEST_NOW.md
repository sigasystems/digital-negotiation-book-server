# 🧪 Quick Test - Find the Issue

## The Problem

Webhook shows:
```
Mode: payment          ❌
Subscription ID: null  ❌
```

This means Stripe is creating a **one-time payment** instead of a **subscription**.

---

## Quick Diagnostic

### Step 1: Restart Server
```bash
npm run dev
```

### Step 2: Try to Create Subscription

Go to your frontend and click "Complete Purchase".

### Step 3: Check Server Logs

**Look for these logs:**

```
📝 Create checkout session request:
   userId: xxxxx
   planId: xxxxx
   billingCycle: ???  ← What does this show?
```

---

## Possible Results

### Result 1: billingCycle is undefined
```
billingCycle: undefined  ❌
```

**Problem:** Frontend not sending billingCycle

**Fix:** Update frontend to send:
```javascript
{
  userId: user.id,
  planId: plan.id,
  billingCycle: 'monthly'  // Add this!
}
```

---

### Result 2: Plan price is 0
```
📋 Plan details:
   Monthly price: 0  ❌
   Yearly price: 0   ❌
```

**Problem:** Plan has no price

**Fix:** Update plan in database:
```sql
UPDATE plans
SET "priceMonthly" = 2999, "priceYearly" = 29990
WHERE id = 'your-plan-id';
```

---

### Result 3: Session mode is "payment"
```
✅ Stripe checkout session created
   Session mode: payment  ❌
```

**Problem:** Stripe is creating one-time payment

**Possible causes:**
1. Frontend sending wrong data
2. Plan price is 0
3. billingCycle missing

---

## Quick Fix (Temporary)

Add default billingCycle in backend:

```javascript
// In routes/subscription.route.js
const { 
  userId, 
  planId, 
  billingCycle = 'monthly'  // ✅ Add default
} = req.body;
```

This way it will work even if frontend doesn't send it.

---

## Test with cURL (Bypass Frontend)

Test directly with cURL to see if backend works:

```bash
curl -X POST http://localhost:5000/api/subscription/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "d3d008e5-431b-4947-a14d-45e4cc574018",
    "planId": "f06f0a6d-3bd0-4e28-86ba-53ee1f237c18",
    "billingCycle": "monthly"
  }'
```

**Check server logs:**
- Should show "Mode: subscription" ✅
- Should create session successfully ✅

**If this works:**
- Backend is fine ✅
- Problem is in frontend ❌

**If this doesn't work:**
- Check plan price in database
- Check plan exists

---

## What to Send Me

Run the test and send me the **complete server logs** showing:

```
📝 Create checkout session request:
   userId: ???
   planId: ???
   billingCycle: ???

📋 Plan details:
   Name: ???
   Monthly price: ???
   Yearly price: ???

💳 Creating Stripe session:
   Mode: ???
   Price: ???
   Interval: ???
```

This will tell me exactly what's wrong!

---

## Most Likely Issue

**Frontend is NOT sending `billingCycle`**

Check your frontend code where you call the API:

```javascript
// Find this in your frontend
fetch('/api/subscription/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    userId: ???,
    planId: ???,
    billingCycle: ???  // ← Is this here?
  })
})
```

If `billingCycle` is missing, add it!

---

**Restart server with the new logging and try again. Send me the logs!** 🔍
