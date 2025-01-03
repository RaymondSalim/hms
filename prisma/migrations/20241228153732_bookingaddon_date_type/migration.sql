/*
  Warnings:

  - Made the column `end_date` on table `BookingAddOn` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BookingAddOn" ALTER COLUMN "end_date" SET NOT NULL,
ALTER COLUMN "end_date" SET DATA TYPE DATE,
ALTER COLUMN "start_date" SET DATA TYPE DATE;
