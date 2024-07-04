/*
  Warnings:

  - Made the column `name` on table `siteusers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "siteusers"
    ALTER COLUMN "name" SET NOT NULL;
