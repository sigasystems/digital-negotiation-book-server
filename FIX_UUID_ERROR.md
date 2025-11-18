# 🔧 Fix: UUID Error for subscriptionId

## The Error

```
"error": "invalid input syntax for type uuid: "sub_1SUiv97FTn66mtXzoHuv2cYt""
```

## Root Cause

Your `payments` table has `subscriptionId` column defined as **UUID type** in the database, but Stripe subscription IDs are **STRINGS** like `"sub_xxxxx"`, not UUIDs!

**UUID format:** `ffaa5b3d-a83c-4b70-b827-45bd5b573071` ✅
**Stripe subscription ID:** `sub_1SUiv97FTn66mtXzoHuv2cYt` ❌ (Not a UUID!)

---

## Solution: Change Column Type

### Option 1: Run Migration (Recommended)

```bash
# Run the migration
npm run migrate

# Or with sequelize-cli
npx sequelize-cli db:migrate
```

This will change `subscriptionId` from UUID to STRING.

---

### Option 2: Run SQL Directly

Connect to your database and run:

```sql
-- Remove unique constraint if exists
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_subscriptionId_key;

-- Change column type from UUID to VARCHAR
ALTER TABLE payments 
ALTER COLUMN "subscriptionId" TYPE VARCHAR(255) USING "subscriptionId"::VARCHAR;

-- Verify the change
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name = 'subscriptionId';
```

**Expected result:**
```
column_name     | data_type
----------------|------------------
subscriptionId  | character varying
```

---

### Option 3: Drop and Recreate Table (Nuclear Option)

**⚠️ WARNING: This will delete all payment records!**

```sql
-- Backup first!
CREATE TABLE payments_backup AS SELECT * FROM payments;

-- Drop table
DROP TABLE payments CASCADE;

-- Recreate with correct schema
-- (Sequelize will recreate it on next server start)
```

Then restart server: `npm run dev`

---

## Verify the Fix

### Step 1: Check Column Type

```sql
SELECT 
  column_name, 
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name = 'subscriptionId';
```

**Should show:**
```
data_type: character varying
character_maximum_length: 255
```

### Step 2: Test Insert

```sql
-- This should work now
INSERT INTO payments (
  id,
  "userId",
  "planId",
  amount,
  status,
  "transactionId",
  "subscriptionId"
) VALUES (
  gen_random_uuid(),
  'ffaa5b3d-a83c-4b70-b827-45bd5b573071',
  'f06f0a6d-3bd0-4e28-86ba-53ee1f237c18',
  2999,
  'success',
  'cs_test_xxxxx',
  'sub_1SUiv97FTn66mtXzoHuv2cYt'  -- ✅ Should work now!
);
```

### Step 3: Test Webhook

1. Restart server: `npm run dev`
2. Create new subscription
3. Check webhook logs:

```
✅ Webhook verified: checkout.session.completed
💳 Payment found: xxxxx
✅ Payment updated: status=success, subscriptionId=sub_xxxxx  ✅ No error!
```

---

## Why This Happened

### In Your Model (Correct):
```javascript
// models/payment.model.js
subscriptionId: {
  type: DataTypes.STRING,  // ✅ Correct!
  allowNull: true,
}
```

### In Your Database (Wrong):
```sql
-- Database schema
"subscriptionId" UUID  -- ❌ Wrong type!
```

**Mismatch!** Model says STRING, database has UUID.

---

## How to Prevent This

### When Creating Tables:

Always ensure Sequelize model matches database schema:

```javascript
// Model definition
subscriptionId: {
  type: DataTypes.STRING,  // For Stripe IDs
  allowNull: true,
}

// NOT:
subscriptionId: {
  type: DataTypes.UUID,  // ❌ Wrong for Stripe IDs!
  allowNull: true,
}
```

### When Creating Migrations:

```javascript
// Correct migration
await queryInterface.createTable('payments', {
  subscriptionId: {
    type: Sequelize.STRING,  // ✅ Correct
    allowNull: true,
  }
});

// NOT:
await queryInterface.createTable('payments', {
  subscriptionId: {
    type: Sequelize.UUID,  // ❌ Wrong
    allowNull: true,
  }
});
```

---

## After Fixing

### Test Complete Flow:

1. **Create subscription:**
   - Go to frontend
   - Select plan
   - Use card: `4242 4242 4242 4242`
   - Complete checkout

2. **Check webhook logs:**
   ```
   ✅ Webhook verified: checkout.session.completed
   💳 Payment found: xxxxx
   ✅ Payment updated: status=success, subscriptionId=sub_xxxxx
   
   ✅ Webhook verified: customer.subscription.created
   🎉 Subscription created: sub_xxxxx
   ✅ Subscription created in database: xxxxx
   ```

3. **Check database:**
   ```sql
   SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT 1;
   ```
   
   **Expected:**
   ```json
   {
     "status": "success",
     "subscriptionId": "sub_1SUiv97FTn66mtXzoHuv2cYt",  ✅ Works!
     "transactionId": "cs_test_xxxxx"
   }
   ```

4. **Check Stripe Dashboard:**
   - Webhooks → Your endpoint → Recent deliveries
   - Should show: `200 OK` ✅
   - No errors ✅

---

## Summary

**Problem:** Database column type mismatch
- Model: STRING ✅
- Database: UUID ❌

**Solution:** Change database column to STRING

**Steps:**
1. Run migration: `npm run migrate`
2. Restart server: `npm run dev`
3. Test subscription
4. Verify webhook works

**Result:** Webhook will successfully update payment with subscriptionId! 🎉

---

## Quick Fix Commands

```bash
# 1. Run migration
npm run migrate

# 2. Restart server
npm run dev

# 3. Test subscription
# Go to frontend and create subscription

# 4. Check logs
# Should see: ✅ Payment updated: subscriptionId=sub_xxxxx
```

---

**After this fix, everything will work perfectly!** 🚀
