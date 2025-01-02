/*
  Warnings:

  - You are about to drop the column `internal_description` on the `bills` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bill_items"
    ADD COLUMN "internal_description" VARCHAR(255);

-- Copy Values
UPDATE "bill_items"
SET "internal_description" = (SELECT "internal_description"
                              FROM "bills"
                              WHERE "bills".id = "bill_items".bill_id
    )
WHERE EXISTS (
    SELECT 1
    FROM "bills"
    WHERE "bills".id = "bill_items".bill_id
    );

-- AlterTable
ALTER TABLE "bills" DROP COLUMN "internal_description";
