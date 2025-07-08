-- Rollback Script for Deposit Income Logic Fix
-- This script restores the original transaction state from backup
-- Only run this if something goes wrong with the migration

BEGIN TRANSACTION;

-- Check if backup tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions_backup') THEN
        RAISE EXCEPTION 'Backup table transactions_backup does not exist. Cannot rollback.';
    END IF;
END $$;

-- Delete all current transactions
DELETE FROM transactions WHERE id > -50;

-- Restore transactions from backup
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

-- Optional: Drop backup tables (uncomment if you want to clean up)
DROP TABLE IF EXISTS transactions_backup;
DROP TABLE IF EXISTS payment_analysis_backup;
DROP TABLE IF EXISTS deposits_backup;

COMMIT;
