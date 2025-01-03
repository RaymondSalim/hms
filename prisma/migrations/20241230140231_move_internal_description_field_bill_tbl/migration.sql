/*
  Warnings:

  - You are about to drop the column `internal_description` on the `bills` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bill_items"
    ADD COLUMN "internal_description" VARCHAR(255);

-- Copy Values
INSERT INTO "bill_items" (bill_id, description, amount)
SELECT
    id AS bill_id,
    internal_description AS description,
    amount
FROM "bills";

-- AlterTable
ALTER TABLE "bills"
    DROP COLUMN "internal_description";
