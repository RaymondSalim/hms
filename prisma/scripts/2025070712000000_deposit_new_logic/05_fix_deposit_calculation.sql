-- Corrected Deposit Income Logic Migration Script
-- This script fixes the proportional allocation issue by using actual deposit amounts
-- Run this AFTER running the original migration to correct the deposit amounts

BEGIN TRANSACTION;

-- Step 1: Create a temporary table with correct payment analysis
CREATE TEMP TABLE corrected_payment_analysis AS
SELECT
    p.id as payment_id,
    p.booking_id,
    p.amount as payment_amount,
    p.payment_date,
    r.location_id,
    -- Correct deposit amount calculation (actual deposit amount, not proportional)
    COALESCE(
        SUM(CASE
            WHEN bi.related_id->>'deposit_id' IS NOT NULL
            THEN LEAST(d.amount, pb.amount)
            ELSE 0
        END),
        0
    ) as correct_deposit_amount,
    -- Correct regular amount (remaining after deposit)
    COALESCE(
        SUM(CASE
            WHEN bi.related_id->>'deposit_id' IS NOT NULL
            THEN pb.amount - LEAST(d.amount, pb.amount)
            ELSE pb.amount
        END),
        0
    ) as correct_regular_amount,
    -- Current incorrect calculation for comparison
    COALESCE(
        SUM(CASE
            WHEN bi.related_id->>'deposit_id' IS NOT NULL
            THEN pb.amount * (bi.amount / bill_total.total_amount)
            ELSE 0
        END),
        0
    ) as current_deposit_amount,
    d.id as deposit_id,
    d.amount as actual_deposit_amount
FROM payments p
JOIN bookings b ON p.booking_id = b.id
JOIN rooms r ON b.room_id = r.id
JOIN payment_bills pb ON p.id = pb.payment_id
JOIN bills bl ON pb.bill_id = bl.id
JOIN bill_items bi ON bl.id = bi.bill_id
-- Calculate total bill amount for comparison (current method)
JOIN (
    SELECT
        bl.id as bill_id,
        SUM(bi.amount) as total_amount
    FROM bills bl
    JOIN bill_items bi ON bl.id = bi.bill_id
    GROUP BY bl.id
) bill_total ON bl.id = bill_total.bill_id
-- Get actual deposit information
LEFT JOIN deposits d ON d.booking_id = p.booking_id
GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id, d.id, d.amount;

-- Step 2: Update deposit transaction amounts with correct values
UPDATE transactions t
SET 
    amount = cpa.correct_deposit_amount,
    "updatedAt" = NOW()
FROM corrected_payment_analysis cpa
WHERE t.related_id->>'payment_id' = cpa.payment_id::text
AND t.category = 'Deposit'
AND t.type = 'INCOME'
AND t.related_id->>'deposit_id' = 'true'
AND ABS(t.amount - cpa.correct_deposit_amount) > 0.01;

-- Step 3: Update regular income transaction amounts with correct values
UPDATE transactions t
SET 
    amount = cpa.correct_regular_amount,
    "updatedAt" = NOW()
FROM corrected_payment_analysis cpa
WHERE t.related_id->>'payment_id' = cpa.payment_id::text
AND t.category = 'Biaya Sewa'
AND t.type = 'INCOME'
AND ABS(t.amount - cpa.correct_regular_amount) > 0.01;

-- Step 4: Create missing deposit transactions for payments that should have them
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
    cpa.location_id,
    'Deposit' as category,
    cpa.correct_deposit_amount as amount,
    cpa.payment_date as date,
    'Deposit diterima untuk Pembayaran #' || cpa.payment_id as description,
    'INCOME'::"TransactionType" as type,
    json_build_object('payment_id', cpa.payment_id, 'deposit_id', true) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM corrected_payment_analysis cpa
WHERE cpa.correct_deposit_amount > 0
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'payment_id' = cpa.payment_id::text
    AND t.category = 'Deposit'
    AND t.type = 'INCOME'
);

-- Step 5: Create missing regular income transactions for payments that should have them
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
    cpa.location_id,
    'Biaya Sewa' as category,
    cpa.correct_regular_amount as amount,
    cpa.payment_date as date,
    'Pemasukan untuk Pembayaran #' || cpa.payment_id as description,
    'INCOME'::"TransactionType" as type,
    json_build_object('payment_id', cpa.payment_id) as related_id,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM corrected_payment_analysis cpa
WHERE cpa.correct_regular_amount > 0
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'payment_id' = cpa.payment_id::text
    AND t.category = 'Biaya Sewa'
    AND t.type = 'INCOME'
);

-- Step 6: Remove transactions with zero amounts
DELETE FROM transactions
WHERE related_id->>'payment_id' IS NOT NULL
AND type = 'INCOME'
AND amount = 0;

-- Step 7: Validation - Show the corrections made
SELECT
    'CORRECTION SUMMARY' as section,
    COUNT(*) as total_payments_analyzed,
    COUNT(CASE WHEN correct_deposit_amount > 0 THEN 1 END) as payments_with_deposits,
    COUNT(CASE WHEN ABS(current_deposit_amount - correct_deposit_amount) > 0.01 THEN 1 END) as payments_corrected,
    SUM(correct_deposit_amount) as total_correct_deposit_amount,
    SUM(correct_regular_amount) as total_correct_regular_amount
FROM corrected_payment_analysis;

-- Step 8: Show specific corrections made
SELECT
    'SPECIFIC CORRECTIONS' as section,
    payment_id,
    payment_amount,
    current_deposit_amount as old_deposit_amount,
    correct_deposit_amount as new_deposit_amount,
    correct_regular_amount as new_regular_amount,
    actual_deposit_amount,
    CASE
        WHEN ABS(current_deposit_amount - correct_deposit_amount) > 0.01
        THEN 'CORRECTED'
        ELSE 'NO CHANGE'
    END as status
FROM corrected_payment_analysis
WHERE correct_deposit_amount > 0
ORDER BY ABS(current_deposit_amount - correct_deposit_amount) DESC, payment_id;

-- Clean up temporary table
DROP TABLE corrected_payment_analysis;

COMMIT;

-- Final validation query
SELECT
    'FINAL TRANSACTION STATE' as section,
    category,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions
WHERE category IN ('Deposit', 'Biaya Sewa')
GROUP BY category, type
ORDER BY category, type; 