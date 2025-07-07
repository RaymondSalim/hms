-- Rollback Script for Deposit Correction
-- This script restores the original proportional calculation if the correction causes issues
-- Only run this if the correction causes problems

BEGIN TRANSACTION;

-- Check if backup tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions_backup') THEN
        RAISE EXCEPTION 'Backup table transactions_backup does not exist. Cannot rollback.';
    END IF;
END $$;

-- Create backup of current state before rollback
CREATE TABLE transactions_before_rollback AS
SELECT
    *,
    NOW() as backup_created_at
FROM transactions;

-- Restore transactions from original backup
DELETE FROM transactions WHERE id > -50;

INSERT INTO transactions (
    id,
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
    id,
    location_id,
    category,
    amount,
    date,
    description,
    type,
    related_id,
    "createdAt",
    "updatedAt"
FROM transactions_backup;

-- Reset the sequence for transactions table
SELECT setval(pg_get_serial_sequence('transactions', 'id'), (SELECT MAX(id) FROM transactions), true);

-- Show rollback summary
SELECT
    'Rollback Complete' as status,
    COUNT(*) as total_transactions_restored,
    COUNT(CASE WHEN category = 'Deposit' THEN 1 END) as deposit_transactions,
    COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as income_transactions,
    COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as expense_transactions
FROM transactions;

-- Optional: Drop the before_rollback backup table (uncomment if you want to clean up)
-- DROP TABLE IF EXISTS transactions_before_rollback;

COMMIT; 