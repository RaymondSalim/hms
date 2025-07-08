# Deposit Income Logic Migration Scripts

This directory contains SQL scripts to migrate existing data to the new deposit income logic where deposits are counted as income when received, not when applied.

## Problem Solved

The old logic had a double income recognition issue:
1. Payments (including deposits) created income transactions immediately
2. When deposits were applied, additional income transactions were created
3. This resulted in deposits being counted as income twice

## New Logic

- **Deposits are counted as income when received** (as part of payment)
- **No additional income when deposits are applied**
- **Expense transactions created when deposits are refunded**
- **Separate transaction categories**: "Biaya Sewa" for regular income, "Deposit" for deposits

## ⚠️ IMPORTANT: Proportional Allocation Issue

The original migration scripts had a **critical flaw** in the deposit calculation logic:

### The Problem
The original scripts used **proportional allocation** based on bill item amounts:
```sql
-- INCORRECT: Proportional calculation
pb.amount * (bi.amount / bill_total.total_amount)
```

This caused deposit amounts to be calculated incorrectly when payments covered multiple bill items.

### The Solution
Deposits should use the **actual deposit amount** from the `deposits` table:
```sql
-- CORRECT: Actual deposit amount
LEAST(d.amount, pb.amount)
```

## Migration Scripts

### 1. `01_backup_before_deposit_fix.sql`
**Purpose**: Creates backup tables before migration
**When to run**: BEFORE running the main migration
**What it does**:
- Creates `transactions_backup` table
- Creates `payment_analysis_backup` table  
- Creates `deposits_backup` table
- Shows backup summary

### 2. `02_dry_run_deposit_fix.sql`
**Purpose**: Shows what changes would be made without executing them
**When to run**: Before the main migration to preview changes
**What it shows**:
- Transactions that would be deleted
- Transactions that would be created
- Payment analysis with amount calculations
- Current vs projected transaction state

### 3. `03_fix_deposit_income_logic.sql`
**Purpose**: Main migration script (has proportional allocation issue)
**When to run**: After backup and dry-run
**What it does**:
- Analyzes all payments to separate deposit and regular amounts
- Deletes old income transactions for payments
- Creates new regular income transactions (category: "Biaya Sewa")
- Creates new deposit income transactions (category: "Deposit")
- Removes duplicate income transactions from applied deposits
- Creates expense transactions for refunded deposits
- Validates the migration

### 4. `04_diagnose_deposit_issue.sql` ⭐ NEW
**Purpose**: Diagnoses the proportional allocation issue
**When to run**: After running the original migration to see the problems
**What it shows**:
- Comparison between current (incorrect) and correct deposit amounts
- Summary statistics of the issue
- Current transaction state

### 5. `05_fix_deposit_calculation.sql` ⭐ NEW
**Purpose**: Corrects the proportional allocation issue
**When to run**: After running the original migration to fix the amounts
**What it does**:
- Recalculates deposit amounts using actual deposit values
- Updates existing transaction amounts
- Creates missing transactions
- Removes zero-amount transactions
- Shows correction summary

### 6. `06_rollback_deposit_correction.sql` ⭐ NEW
**Purpose**: Rollback for the correction if needed
**When to run**: Only if the correction causes issues
**What it does**:
- Restores original proportional calculation
- Creates backup before rollback
- Shows rollback summary

### 7. `rollback_deposit_fix.sql`
**Purpose**: Restores original state if something goes wrong
**When to run**: Only if migration fails or causes issues
**What it does**:
- Restores all transactions from backup
- Resets transaction ID sequence
- Shows rollback summary

## Migration Process

### Step 1: Backup
```sql
\i prisma/scripts/01_backup_before_deposit_fix.sql
```

### Step 2: Dry Run
```sql
\i prisma/scripts/02_dry_run_deposit_fix.sql
```
Review the output to ensure the changes look correct.

### Step 3: Execute Migration
```sql
\i prisma/scripts/03_fix_deposit_income_logic.sql
```

### Step 4: Diagnose Issues ⭐ NEW
```sql
\i prisma/scripts/04_diagnose_deposit_issue.sql
```
Review the output to see the proportional allocation problems.

### Step 5: Apply Correction ⭐ NEW
```sql
\i prisma/scripts/05_fix_deposit_calculation.sql
```

### Step 6: Verify Results
Check the final validation query output to ensure:
- Total transaction count is reasonable
- Deposit income transactions have correct amounts
- Deposit expense transactions exist for refunds
- Regular income transactions have correct amounts

## What the Migration Does

### For Each Payment:
1. **Analyzes bill items** to determine deposit vs regular amounts
2. **Uses actual deposit amounts** (not proportional allocation)
3. **Creates separate transactions**:
   - Regular income: `category = 'Biaya Sewa'`
   - Deposit income: `category = 'Deposit'`

### For Deposits:
1. **Removes duplicate income** from applied deposits
2. **Adds expense transactions** for refunded deposits

### Validation:
- Ensures payment amounts match calculated totals
- Checks for orphaned transactions
- Provides summary statistics

## Important Notes

1. **Always backup first** - The backup script creates safety copies
2. **Run dry-run first** - Preview changes before executing
3. **Test in staging** - Run on a copy of production data first
4. **Monitor after migration** - Check financial reports for accuracy
5. **Keep backups** - Don't delete backup tables immediately
6. **Run correction script** - The original migration has proportional allocation issues

## Troubleshooting

### If Migration Fails:
1. Check PostgreSQL logs for errors
2. Run the rollback script if needed
3. Investigate the specific error
4. Fix data issues if necessary
5. Re-run migration

### If Correction Fails:
1. Check the diagnostic script output
2. Run the correction rollback script if needed
3. Investigate specific issues
4. Re-run correction

### Common Issues:
- **Amount mismatches**: Payment amounts don't match calculated totals
- **Missing bill items**: Some payments have incomplete bill item data
- **Orphaned transactions**: Transactions without corresponding payments
- **Proportional allocation errors**: Deposit amounts calculated incorrectly

### If Rollback is Needed:
```sql
-- For original migration
\i prisma/scripts/rollback_deposit_fix.sql

-- For correction
\i prisma/scripts/06_rollback_deposit_correction.sql
```

## Post-Migration Verification

After migration and correction, verify:
1. **Financial reports** show correct income totals
2. **Deposit transactions** appear with category "Deposit" and correct amounts
3. **Refund transactions** appear as expenses
4. **No duplicate income** for applied deposits
5. **Payment totals** match transaction totals
6. **Deposit amounts** match actual deposit values (not proportional)

## File Structure

```
prisma/scripts/
├── README_deposit_migration.md          # This file
├── 01_backup_before_deposit_fix.sql     # Backup script
├── 02_dry_run_deposit_fix.sql           # Preview script
├── 03_fix_deposit_income_logic.sql      # Main migration (has issues)
├── 04_diagnose_deposit_issue.sql        # ⭐ NEW: Diagnostic script
├── 05_fix_deposit_calculation.sql       # ⭐ NEW: Correction script
├── 06_rollback_deposit_correction.sql   # ⭐ NEW: Correction rollback
└── rollback_deposit_fix.sql             # Original rollback script
``` 