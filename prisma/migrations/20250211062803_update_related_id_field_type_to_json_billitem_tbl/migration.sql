/*
  Warnings:

  - The `related_id` column on the `bill_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "bill_items" DROP COLUMN "related_id",
ADD COLUMN     "related_id" JSONB;
