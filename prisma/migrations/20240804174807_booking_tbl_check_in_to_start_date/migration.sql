/*
  Warnings:

  - You are about to drop the column `check_in` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `start_date` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" RENAME COLUMN "check_in" TO "start_date";
