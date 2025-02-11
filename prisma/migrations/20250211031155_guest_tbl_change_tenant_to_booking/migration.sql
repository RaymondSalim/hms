/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `guests` table. All the data in the column will be lost.
  - Added the required column `booking_id` to the `guests` table without a default value. This is not possible if the table is not empty.

*/

-- DropForeignKey
ALTER TABLE "guests" DROP CONSTRAINT "guests_tenant_id_fkey";

-- AlterTable Add booking_id
ALTER TABLE "guests"
    ADD COLUMN "booking_id" INTEGER NOT NULL default 0;

-- Update guests with the first available booking ID
UPDATE "guests" g
SET "booking_id" = (
    SELECT b.id FROM "bookings" b
    WHERE b.tenant_id = (SELECT tenant_id FROM "guests" WHERE "guests".id = g.id)
    ORDER BY b.start_date
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM "bookings" b
    WHERE b.tenant_id = (SELECT tenant_id FROM "guests" WHERE "guests".id = g.id)
);

-- AlterTable Drop tenant_id
ALTER TABLE "guests"
    DROP COLUMN "tenant_id";

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

SELECT * FROM "guests";