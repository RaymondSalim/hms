-- Dry Run Script for Deposit Income Logic Fix
-- This script shows what changes would be made WITHOUT actually executing them
-- Run this to preview the migration before running the actual fix

-- Step 1: Analyze current payment data
WITH payment_analysis AS (
    SELECT
        p.id as payment_id,
        p.booking_id,
        p.amount as payment_amount,
        p.payment_date,
        r.location_id,
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
    GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id
)

-- Show what would be deleted
SELECT
    'TRANSACTIONS TO BE DELETED' as action,
    COUNT(*) as count,
    'Income transactions for payments' as description
FROM transactions
WHERE related_id->>'payment_id' IS NOT NULL
AND type = 'INCOME'

UNION ALL

SELECT
    'TRANSACTIONS TO BE DELETED' as action,
    COUNT(*) as count,
    'Deposit applied income transactions' as description
FROM transactions
WHERE description LIKE '%Deposit applied as income%'
OR description LIKE '%Deposit partially refunded, remainder recognized as income%'

UNION ALL

-- Show what would be created
SELECT
    'TRANSACTIONS TO BE CREATED' as action,
    COUNT(*) as count,
    'Regular income transactions' as description
FROM payment_analysis pa
WHERE pa.regular_amount > 0

UNION ALL

SELECT
    'TRANSACTIONS TO BE CREATED' as action,
    COUNT(*) as count,
    'Deposit income transactions' as description
FROM payment_analysis pa
WHERE pa.deposit_amount > 0

UNION ALL

SELECT
    'TRANSACTIONS TO BE CREATED' as action,
    COUNT(*) as count,
    'Deposit refund expense transactions' as description
FROM deposits d
JOIN bookings b ON d.booking_id = b.id
JOIN rooms r ON b.room_id = r.id
WHERE d.status IN ('REFUNDED', 'PARTIALLY_REFUNDED')
AND d.refunded_amount IS NOT NULL
AND d.refunded_at IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.related_id->>'booking_id' = d.booking_id::text
    AND t.description LIKE '%refunded%'
    AND t.type = 'EXPENSE'
);

-- Show detailed analysis
WITH payment_analysis AS (
    SELECT
        p.id as payment_id,
        p.booking_id,
        p.amount as payment_amount,
        p.payment_date,
        r.location_id,
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
    GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id
)

SELECT
    'PAYMENT ANALYSIS' as section,
    pa.payment_id,
    pa.payment_amount as original_amount,
    pa.regular_amount,
    pa.deposit_amount,
    pa.regular_amount + pa.deposit_amount as calculated_total,
    CASE
        WHEN ABS(pa.payment_amount - (pa.regular_amount + pa.deposit_amount)) > 0.01
        THEN 'MISMATCH'
        ELSE 'OK'
    END as amount_check,
    CASE
        WHEN pa.deposit_amount > 0 THEN 'Has Deposit'
        ELSE 'No Deposit'
    END as deposit_status
FROM payment_analysis pa
ORDER BY pa.payment_id;

-- Show current transaction state
SELECT
    'CURRENT TRANSACTION STATE' as section,
    category,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY category, type
ORDER BY category, type;

-- Show what the new transaction state would look like
WITH payment_analysis AS (
    SELECT
        p.id as payment_id,
        p.booking_id,
        p.amount as payment_amount,
        p.payment_date,
        r.location_id,
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN pb.amount * (bi.amount / bill_total.total_amount)
                ELSE 0
            END),
            0
        ) as deposit_amount,
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
    JOIN payment_bills pb ON p.id = pb.payment_id
    JOIN bills bl ON pb.bill_id = bl.id
    JOIN bill_items bi ON bl.id = bi.bill_id
    JOIN (
        SELECT
            bl.id as bill_id,
            SUM(bi.amount) as total_amount
        FROM bills bl
        JOIN bill_items bi ON bl.id = bi.bill_id
        GROUP BY bl.id
    ) bill_total ON bl.id = bill_total.bill_id
    GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id
),
new_transactions AS (
    -- Regular income transactions
    SELECT
        'Biaya Sewa' as category,
        'INCOME'::"TransactionType" as type,
        pa.regular_amount as amount
    FROM payment_analysis pa
    WHERE pa.regular_amount > 0

    UNION ALL

    -- Deposit income transactions
    SELECT
        'Deposit' as category,
        'INCOME'::"TransactionType" as type,
        pa.deposit_amount as amount
    FROM payment_analysis pa
    WHERE pa.deposit_amount > 0

    UNION ALL

    -- Existing non-payment transactions
    SELECT
        t.category,
        t.type,
        t.amount
    FROM transactions t
    WHERE t.related_id->>'payment_id' IS NULL
    AND NOT (t.description LIKE '%Deposit applied as income%' OR t.description LIKE '%Deposit partially refunded, remainder recognized as income%')

    UNION ALL

    -- New deposit refund expense transactions
    SELECT
        'Deposit' as category,
        'EXPENSE' as type,
        d.refunded_amount as amount
    FROM deposits d
    JOIN bookings b ON d.booking_id = b.id
    JOIN rooms r ON b.room_id = r.id
    WHERE d.status IN ('REFUNDED', 'PARTIALLY_REFUNDED')
    AND d.refunded_amount IS NOT NULL
    AND d.refunded_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.related_id->>'booking_id' = d.booking_id::text
        AND t.description LIKE '%refunded%'
        AND t.type = 'EXPENSE'
    )
)

SELECT
    'PROJECTED NEW TRANSACTION STATE' as section,
    category,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM new_transactions
GROUP BY category, type
ORDER BY category, type;
