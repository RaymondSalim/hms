/*
  Warnings:

  - A unique constraint covering the columns `[name,location_id]` on the table `AddOn` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BookingAddOn" ALTER COLUMN "input" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_name_location_id_key" ON "AddOn"("name", "location_id");
