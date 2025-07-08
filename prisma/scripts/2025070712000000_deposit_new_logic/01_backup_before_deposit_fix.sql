-- Backup script for transactions before deposit income logic fix
-- Run this BEFORE running the main migration script

BEGIN TRANSACTION;

-- Create backup table with current transaction data
CREATE TABLE transactions_backup AS
SELECT
    *,
    NOW() as backup_created_at
FROM transactions;

-- Create backup table for payment analysis
CREATE TABLE payment_analysis_backup AS
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
    ) as regular_amount,
    NOW() as backup_created_at
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
GROUP BY p.id, p.booking_id, p.amount, p.payment_date, r.location_id;

-- Create backup table for deposits
CREATE TABLE deposits_backup AS
SELECT
    *,
    NOW() as backup_created_at
FROM deposits;

-- Show backup summary
SELECT
    'Backup Created' as status,
    COUNT(*) as total_transactions_backed_up,
    COUNT(CASE WHEN category = 'Deposit' THEN 1 END) as deposit_transactions,
    COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as income_transactions,
    COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as expense_transactions
FROM transactions_backup;

SELECT
    'Payment Analysis Backup' as status,
    COUNT(*) as total_payments_backed_up,
    SUM(CASE WHEN deposit_amount > 0 THEN 1 ELSE 0 END) as payments_with_deposits,
    SUM(deposit_amount) as total_deposit_amount,
    SUM(regular_amount) as total_regular_amount
FROM payment_analysis_backup;

SELECT
    'Deposits Backup' as status,
    COUNT(*) as total_deposits_backed_up,
    COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refunded_deposits,
    COUNT(CASE WHEN status = 'PARTIALLY_REFUNDED' THEN 1 END) as partially_refunded_deposits,
    COUNT(CASE WHEN status = 'APPLIED' THEN 1 END) as applied_deposits
FROM deposits_backup;

COMMIT;
