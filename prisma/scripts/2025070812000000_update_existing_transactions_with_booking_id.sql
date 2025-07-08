-- Update existing transactions to include booking_id in related_id
-- This script updates transactions that have payment_id but are missing booking_id
-- Handles corrupted JSON data safely

BEGIN TRANSACTION;

-- Step 1: Create a backup of current transactions
CREATE TABLE transactions_backup AS
SELECT 
    *,
    NOW() as backup_created_at
FROM transactions;

-- Step 2: First, let's see what we're dealing with - check for corrupted JSON
SELECT 
    'CORRUPTED JSON CHECK' as section,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN related_id IS NULL THEN 1 END) as null_related_id,
    COUNT(CASE WHEN related_id IS NOT NULL AND jsonb_typeof(related_id) = 'object' THEN 1 END) as valid_json_objects,
    COUNT(CASE WHEN related_id IS NOT NULL AND jsonb_typeof(related_id) != 'object' THEN 1 END) as invalid_json
FROM transactions 
WHERE related_id->>'payment_id' IS NOT NULL;

-- Step 3: Clean up any corrupted JSON data first
UPDATE transactions 
SET 
    related_id = jsonb_build_object('payment_id', related_id->>'payment_id'),
    "updatedAt" = NOW()
WHERE related_id->>'payment_id' IS NOT NULL
AND (related_id IS NULL OR jsonb_typeof(related_id) != 'object');

-- Step 4: Update regular income transactions (Biaya Sewa)
UPDATE transactions 
SET 
    related_id = related_id || jsonb_build_object('booking_id', p.booking_id),
    "updatedAt" = NOW()
FROM payments p
WHERE transactions.related_id->>'payment_id' IS NOT NULL
AND transactions.related_id->>'payment_id' = p.id::text
AND (transactions.related_id->>'booking_id' IS NULL OR transactions.related_id->>'booking_id' = 'null')
AND transactions.category = 'Biaya Sewa'
AND transactions.type = 'INCOME'
AND jsonb_typeof(transactions.related_id) = 'object';

-- Step 5: Update deposit transactions
UPDATE transactions 
SET 
    related_id = related_id || jsonb_build_object('booking_id', p.booking_id),
    "updatedAt" = NOW()
FROM payments p
WHERE transactions.related_id->>'payment_id' IS NOT NULL
AND transactions.related_id->>'payment_id' = p.id::text
AND (transactions.related_id->>'booking_id' IS NULL OR transactions.related_id->>'booking_id' = 'null')
AND transactions.category = 'Deposit'
AND transactions.type = 'INCOME'
AND jsonb_typeof(transactions.related_id) = 'object';

-- Step 6: Update any other payment-related transactions
UPDATE transactions 
SET 
    related_id = related_id || jsonb_build_object('booking_id', p.booking_id),
    "updatedAt" = NOW()
FROM payments p
WHERE transactions.related_id->>'payment_id' IS NOT NULL
AND transactions.related_id->>'payment_id' = p.id::text
AND (transactions.related_id->>'booking_id' IS NULL OR transactions.related_id->>'booking_id' = 'null')
AND transactions.category NOT IN ('Biaya Sewa', 'Deposit')
AND jsonb_typeof(transactions.related_id) = 'object';

-- Step 7: Validation - Show summary of changes
SELECT 
    'UPDATE SUMMARY' as section,
    COUNT(*) as total_transactions_updated,
    COUNT(CASE WHEN category = 'Biaya Sewa' THEN 1 END) as regular_income_updated,
    COUNT(CASE WHEN category = 'Deposit' THEN 1 END) as deposit_income_updated,
    COUNT(CASE WHEN category NOT IN ('Biaya Sewa', 'Deposit') THEN 1 END) as other_transactions_updated
FROM transactions t
WHERE t.related_id->>'payment_id' IS NOT NULL
AND t.related_id->>'booking_id' IS NOT NULL
AND t.related_id->>'booking_id' != 'null'
AND t."updatedAt" >= NOW() - INTERVAL '1 minute';

-- Step 8: Show any transactions that still don't have booking_id (potential issues)
SELECT 
    'POTENTIAL ISSUES' as section,
    t.id as transaction_id,
    t.category,
    t.type,
    t.related_id,
    t.description,
    CASE 
        WHEN t.related_id IS NULL THEN 'related_id is NULL'
        WHEN jsonb_typeof(t.related_id) != 'object' THEN 'related_id is not a valid JSON object'
        WHEN t.related_id->>'booking_id' IS NULL THEN 'Missing booking_id'
        WHEN t.related_id->>'booking_id' = 'null' THEN 'booking_id is null string'
        ELSE 'Other issue'
    END as issue
FROM transactions t
WHERE t.related_id->>'payment_id' IS NOT NULL
AND (t.related_id->>'booking_id' IS NULL OR t.related_id->>'booking_id' = 'null');

-- Step 9: Show sample of updated transactions
SELECT 
    'SAMPLE UPDATED TRANSACTIONS' as section,
    t.id as transaction_id,
    t.category,
    t.type,
    t.related_id,
    t.description,
    t."updatedAt"
FROM transactions t
WHERE t.related_id->>'payment_id' IS NOT NULL
AND t.related_id->>'booking_id' IS NOT NULL
AND t.related_id->>'booking_id' != 'null'
AND t."updatedAt" >= NOW() - INTERVAL '1 minute'
ORDER BY t."updatedAt" DESC
LIMIT 10;

-- Step 10: Verify data integrity
SELECT 
    'DATA INTEGRITY CHECK' as section,
    COUNT(*) as total_payment_transactions,
    COUNT(CASE WHEN related_id->>'booking_id' IS NOT NULL AND related_id->>'booking_id' != 'null' THEN 1 END) as with_booking_id,
    COUNT(CASE WHEN related_id->>'booking_id' IS NULL OR related_id->>'booking_id' = 'null' THEN 1 END) as missing_booking_id,
    CASE 
        WHEN COUNT(CASE WHEN related_id->>'booking_id' IS NULL OR related_id->>'booking_id' = 'null' THEN 1 END) = 0 
        THEN 'ALL TRANSACTIONS HAVE BOOKING_ID' 
        ELSE 'SOME TRANSACTIONS STILL MISSING BOOKING_ID' 
    END as status
FROM transactions 
WHERE related_id->>'payment_id' IS NOT NULL;

COMMIT;

-- Final summary
SELECT 
    'MIGRATION COMPLETE' as status,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN related_id->>'payment_id' IS NOT NULL THEN 1 END) as payment_transactions,
    COUNT(CASE WHEN related_id->>'payment_id' IS NOT NULL AND related_id->>'booking_id' IS NOT NULL AND related_id->>'booking_id' != 'null' THEN 1 END) as complete_payment_transactions
FROM transactions; 