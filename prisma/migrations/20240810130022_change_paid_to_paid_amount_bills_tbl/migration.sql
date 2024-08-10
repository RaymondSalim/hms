/*
  Warnings:

  - You are about to drop the column `paid` on the `bills` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bills"
    DROP COLUMN "paid",
    ADD COLUMN "paid_amount" DECIMAL(10, 2);
