/*
  Warnings:

  - Made the column `month_count` on table `durations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "durations" ALTER COLUMN "month_count" SET NOT NULL;
