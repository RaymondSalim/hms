-- Fix Deposit Income Logic Migration Script
-- This script transforms existing data to match the new deposit income logic
-- where deposits are counted as income when received, not when applied

BEGIN TRANSACTION;

-- Step 1: Create a temporary table to store payment analysis
CREATE TEMP TABLE payment_analysis AS
SELECT
    p.id as payment_id,
    p.booking_id,
    p.amount as payment_amount,
    p.payment_date,
    r.location_id,
    -- Get the actual deposit ID for this booking
    d.id as deposit_id,
    -- Calculate deposit amount from bill items
    COALESCE(
        SUM(CASE
            WHEN bi.related_id->>'deposit_id' IS NOT NULL
            THEN pb.amount * (bi.amount / bill_total.total_amount)
            ELSE 0
        END),
        0
    ) as deposit_amount,
    -- Calculate regular amount (non-deposit)
    COALESCE(
        SUM(CASE
            WHEN bi.related_id->>'deposit_id' IS NULL
            THEN pb.amount * (bi.amount / bill_total.total_amount)
            ELSE 0
        END),
        0
    ) as regular_amount
FROM payments p
JOIN bookings b ON p.booking_id = b.id
JOIN rooms r ON b.room_id = r.id
LEFT JOIN deposits d ON d.booking_id = b.id
JOIN payment_bills pb ON p.id = pb.payment_id
JOIN bills bl ON pb.bill_id = bl.id
JOIN bill_items bi ON bl.id = bi.bill_id
-- Calculate total bill amount for proportional allocation
JOIN (
    SELECT
        bl.id as bill_id,
        SUM(bi.amount) as total_amount
    FROM bills bl
    JOIN bill_items bi ON bl.id = bi.bill_id
    GROUP BY bl.id
) bill_total ON bl.id = bill_total.bill_id
GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id, d.id;

-- Step 2: Delete existing income transactions for payments
DELETE FROM transactions
WHERE related_id->>'payment_id' IS NOT NULL
AND type = 'INCOME';

-- Step 3: Create new income transactions for regular amounts only
INSERT INTO transactions (
    location_id,
    category,
    amount,
    date,
    description,
    type,
    related_id,
    "createdAt",
    "updatedAt"
)
SELECT
    pa.location_id,
    'Biaya Sewa' as category,
    pa.regular_amount as amount,
    pa.payment_date as date,
    'Pemasukan untuk Pembayaran #' || pa.payment_id as description,
    'INCOME'::"TransactionType" as type,
    json_build_object('payment_id', pa.payment_id) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM payment_analysis pa
WHERE pa.regular_amount > 0;

-- Step 4: Create deposit transactions for deposit amounts
INSERT INTO transactions (
    location_id,
    category,
    amount,
    date,
    description,
    type,
    related_id,
    "createdAt",
    "updatedAt"
)
SELECT
    pa.location_id,
    'Deposit' as category,
    pa.deposit_amount as amount,
    pa.payment_date as date,
    'Deposit diterima untuk Pembayaran #' || pa.payment_id as description,
    'INCOME'::"TransactionType" as type,
    json_build_object('payment_id', pa.payment_id, 'deposit_id', pa.deposit_id) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM payment_analysis pa
WHERE pa.deposit_amount > 0;

-- Step 5: Remove income transactions for applied deposits (since they're now counted when received)
DELETE FROM transactions
WHERE description LIKE '%Deposit applied as income%'
OR description LIKE '%Deposit partially refunded, remainder recognized as income%';

-- Step 6: Create expense transactions for refunded deposits
INSERT INTO transactions (
    location_id,
    category,
    amount,
    date,
    description,
    type,
    related_id,
    "createdAt",
    "updatedAt"
)
SELECT
    r.location_id,
    'Deposit' as category,
    d.refunded_amount as amount,
    d.refunded_at as date,
    CASE
        WHEN d.status = 'REFUNDED' THEN
            'Deposit fully refunded: ' || d.refunded_amount::text
        WHEN d.status = 'PARTIALLY_REFUNDED' THEN
            'Deposit partially refunded: ' || d.refunded_amount::text
    END as description,
    'EXPENSE'::"TransactionType" as type,
    json_build_object('booking_id', d.booking_id) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM deposits d
JOIN bookings b ON d.booking_id = b.id
JOIN rooms r ON b.room_id = r.id
WHERE d.status IN ('REFUNDED', 'PARTIALLY_REFUNDED')
AND d.refunded_amount IS NOT NULL
AND d.refunded_at IS NOT NULL
AND NOT EXISTS (
    -- Avoid duplicates
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'booking_id' = d.booking_id::text
    AND t.description LIKE '%refunded%'
    AND t.type = 'EXPENSE'
);

-- Step 7: Update transaction amounts for existing payment transactions that were updated
-- This handles cases where payment amounts were changed after creation
UPDATE transactions t
SET amount = pa.regular_amount
FROM payment_analysis pa
WHERE t.related_id->>'payment_id' = pa.payment_id::text
AND t.category = 'Biaya Sewa'
AND t.type = 'INCOME'
AND pa.regular_amount != t.amount;

-- Step 8: Update deposit transaction amounts for existing payment transactions
UPDATE transactions t
SET amount = pa.deposit_amount
FROM payment_analysis pa
WHERE t.related_id->>'payment_id' = pa.payment_id::text
AND t.category = 'Deposit'
AND t.type = 'INCOME'
AND t.related_id->>'deposit_id' = pa.deposit_id::text
AND pa.deposit_amount != t.amount;

-- Step 9: Clean up any orphaned transactions (transactions without corresponding payments)
DELETE FROM transactions
WHERE related_id->>'payment_id' IS NOT NULL
AND type = 'INCOME'
AND NOT EXISTS (
    SELECT 1 FROM payments p
    WHERE p.id = (related_id->>'payment_id')::int
);

-- Step 10: Add missing deposit transactions for payments that only had regular income
-- This handles edge cases where deposits weren't properly tracked
INSERT INTO transactions (
    location_id,
    category,
    amount,
    date,
    description,
    type,
    related_id,
    "createdAt",
    "updatedAt"
)
SELECT
    pa.location_id,
    'Deposit' as category,
    pa.deposit_amount as amount,
    pa.payment_date as date,
    'Deposit diterima untuk Pembayaran #' || pa.payment_id as description,
    'INCOME'::"TransactionType" as type,
    json_build_object('payment_id', pa.payment_id, 'deposit_id', pa.deposit_id) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM payment_analysis pa
WHERE pa.deposit_amount > 0
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'payment_id' = pa.payment_id::text
    AND t.category = 'Deposit'
    AND t.type = 'INCOME'
);

-- Step 11: Validation - Check for any inconsistencies
-- This will show any payments that might have issues
SELECT
    'Payment Analysis Summary' as info,
    COUNT(*) as total_payments,
    SUM(CASE WHEN deposit_amount > 0 THEN 1 ELSE 0 END) as payments_with_deposits,
    SUM(CASE WHEN regular_amount > 0 THEN 1 ELSE 0 END) as payments_with_regular_income,
    SUM(deposit_amount) as total_deposit_amount,
    SUM(regular_amount) as total_regular_amount
FROM payment_analysis;

-- Step 12: Show any potential issues
SELECT
    'Potential Issues' as info,
    p.id as payment_id,
    p.amount as original_amount,
    pa.regular_amount + pa.deposit_amount as calculated_amount,
    CASE
        WHEN ABS(p.amount - (pa.regular_amount + pa.deposit_amount)) > 0.01
        THEN 'Amount mismatch'
        ELSE 'OK'
    END as status
FROM payments p
JOIN payment_analysis pa ON p.id = pa.payment_id
WHERE ABS(p.amount - (pa.regular_amount + pa.deposit_amount)) > 0.01;

-- Clean up temporary table
DROP TABLE payment_analysis;

COMMIT;

-- Final validation query
SELECT
    'Migration Complete' as status,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN category = 'Deposit' AND type = 'INCOME' THEN 1 END) as deposit_income_transactions,
    COUNT(CASE WHEN category = 'Deposit' AND type = 'EXPENSE' THEN 1 END) as deposit_expense_transactions,
    COUNT(CASE WHEN category = 'Biaya Sewa' AND type = 'INCOME' THEN 1 END) as regular_income_transactions
FROM transactions;
