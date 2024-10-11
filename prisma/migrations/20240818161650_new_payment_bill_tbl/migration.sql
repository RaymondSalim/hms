/*
  Warnings:

  - You are about to drop the column `paid_amount` on the `bills` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bills"
    DROP COLUMN "paid_amount";

-- CreateTable
CREATE TABLE "payment_bills"
(
    "payment_id" INTEGER        NOT NULL,
    "bill_id"    INTEGER        NOT NULL,
    "amount"     DECIMAL(10, 2) NOT NULL,

    CONSTRAINT "payment_bills_pkey" PRIMARY KEY ("payment_id", "bill_id")
);

-- AddForeignKey
ALTER TABLE "payment_bills"
    ADD CONSTRAINT "payment_bills_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_bills"
    ADD CONSTRAINT "payment_bills_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
