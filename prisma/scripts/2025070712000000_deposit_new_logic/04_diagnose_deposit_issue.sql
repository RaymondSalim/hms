-- Diagnostic Script for Deposit Income Calculation Issues
-- This script shows the difference between current (incorrect) and correct deposit amounts

WITH payment_analysis AS (
    SELECT
        p.id as payment_id,
        p.booking_id,
        p.amount as payment_amount,
        p.payment_date,
        r.location_id,
        -- Current incorrect calculation (proportional)
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN pb.amount * (bi.amount / bill_total.total_amount)
                ELSE 0
            END),
            0
        ) as current_deposit_amount,
        -- Correct calculation (actual deposit amount)
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN LEAST(d.amount, pb.amount)
                ELSE 0
            END),
            0
        ) as correct_deposit_amount,
        -- Regular amount (remaining after deposit)
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN pb.amount - LEAST(d.amount, pb.amount)
                ELSE pb.amount
            END),
            0
        ) as correct_regular_amount,
        -- Deposit info
        d.id as deposit_id,
        d.amount as actual_deposit_amount,
        d.status as deposit_status
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN rooms r ON b.room_id = r.id
    JOIN payment_bills pb ON p.id = pb.payment_id
    JOIN bills bl ON pb.bill_id = bl.id
    JOIN bill_items bi ON bl.id = bi.bill_id
    -- Calculate total bill amount for proportional allocation (current method)
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
    GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id, d.id, d.amount, d.status
)

-- Show the differences
SELECT
    'DEPOSIT CALCULATION COMPARISON' as section,
    payment_id,
    payment_amount,
    current_deposit_amount,
    correct_deposit_amount,
    correct_regular_amount,
    actual_deposit_amount,
    CASE
        WHEN ABS(current_deposit_amount - correct_deposit_amount) > 0.01
        THEN 'INCORRECT'
        ELSE 'CORRECT'
    END as calculation_status,
    ABS(current_deposit_amount - correct_deposit_amount) as difference
FROM payment_analysis
WHERE actual_deposit_amount > 0
ORDER BY difference DESC, payment_id;

-- Show summary statistics
WITH payment_analysis AS (
    SELECT
        p.id as payment_id,
        p.amount as payment_amount,
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN pb.amount * (bi.amount / bill_total.total_amount)
                ELSE 0
            END),
            0
        ) as current_deposit_amount,
        COALESCE(
            SUM(CASE
                WHEN bi.related_id->>'deposit_id' IS NOT NULL
                THEN LEAST(d.amount, pb.amount)
                ELSE 0
            END),
            0
        ) as correct_deposit_amount
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
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
    LEFT JOIN deposits d ON d.booking_id = p.booking_id
    GROUP BY p.id, p.amount, d.amount
)

SELECT
    'SUMMARY STATISTICS' as section,
    COUNT(*) as total_payments_with_deposits,
    COUNT(CASE WHEN ABS(current_deposit_amount - correct_deposit_amount) > 0.01 THEN 1 END) as payments_with_incorrect_calculation,
    SUM(current_deposit_amount) as total_current_deposit_amount,
    SUM(correct_deposit_amount) as total_correct_deposit_amount,
    SUM(correct_deposit_amount - current_deposit_amount) as total_difference
FROM payment_analysis
WHERE correct_deposit_amount > 0;

-- Show current transaction state
SELECT
    'CURRENT TRANSACTION STATE' as section,
    category,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions
WHERE category = 'Deposit' OR category = 'Biaya Sewa'
GROUP BY category, type
ORDER BY category, type; 