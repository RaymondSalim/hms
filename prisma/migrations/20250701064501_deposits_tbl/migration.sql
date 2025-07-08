/*
  Warnings:

  - You are about to drop the column `deposit` on the `bookings` table. All the data in the column will be lost.

*/
BEGIN TRANSACTION;
-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('UNPAID', 'HELD', 'APPLIED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateTable
CREATE TABLE "deposits" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER UNIQUE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DepositStatus" NOT NULL,
    "refunded_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "refunded_amount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

WITH deposit_payments AS (
    SELECT
        b.id AS booking_id,
        SUM(pb.amount) AS paid_amount,
        MAX(p.payment_date) AS last_payment_date
    FROM bookings b
             JOIN bills bl ON bl.booking_id = b.id
             JOIN bill_items bi ON bi.bill_id = bl.id AND bi.description ILIKE '%deposit%'
    LEFT JOIN payment_bills pb ON pb.bill_id = bl.id
    LEFT JOIN payments p ON p.id = pb.payment_id
WHERE b.deposit IS NOT NULL
GROUP BY b.id
    )
INSERT INTO "deposits" (booking_id, amount, status, refunded_amount)
SELECT
    b.id AS booking_id,
    b.deposit AS amount,
    (CASE
         WHEN dp.paid_amount IS NOT NULL AND dp.paid_amount = b.deposit THEN 'UNPAID'
         WHEN dp.paid_amount IS NOT NULL AND dp.paid_amount < b.deposit AND dp.paid_amount > 0 THEN 'PARTIALLY_REFUNDED'
         WHEN dp.paid_amount IS NULL OR dp.paid_amount = 0 THEN 'UNPAID'
         ELSE 'HELD'
        END)::"DepositStatus" AS status,
    CASE
        WHEN dp.paid_amount IS NOT NULL AND dp.paid_amount < b.deposit AND dp.paid_amount > 0 THEN (b.deposit - dp.paid_amount)
        ELSE NULL
        END AS refunded_amount
FROM bookings b
         LEFT JOIN deposit_payments dp ON dp.booking_id = b.id
WHERE b.deposit IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "deposits" d WHERE d.booking_id = b.id
);

-- 2. Update bill_items that are associated with deposits (description ILIKE '%deposit%'),
--    populating the related_id field with the deposit_id
UPDATE "bill_items"
SET "related_id" = jsonb_build_object('deposit_id', d.id)
FROM "bills" b, "deposits" d
WHERE "bill_items".bill_id = b.id
  AND b.booking_id = d.booking_id
  AND "bill_items".description ILIKE '%deposit%';

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "deposit";

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
