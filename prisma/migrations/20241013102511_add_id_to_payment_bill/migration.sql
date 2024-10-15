/*
  Warnings:

  - The primary key for the `payment_bills` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "payment_bills" DROP CONSTRAINT "payment_bills_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "payment_bills_pkey" PRIMARY KEY ("id");
