-- Fix subscriptionId column type in payments table
-- Current: UUID type (wrong!)
-- Should be: VARCHAR/TEXT type (correct!)

-- Step 1: Check current type
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name = 'subscriptionId';

-- Step 2: Drop the constraint if exists
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_subscriptionId_key;

-- Step 3: Change column type from UUID to VARCHAR
ALTER TABLE payments 
ALTER COLUMN "subscriptionId" TYPE VARCHAR(255) USING "subscriptionId"::VARCHAR;

-- Step 4: Verify the change
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name = 'subscriptionId';

-- Step 5: Test insert
-- This should now work:
-- INSERT INTO payments (..., "subscriptionId") 
-- VALUES (..., 'sub_1SUiv97FTn66mtXzoHuv2cYt');
