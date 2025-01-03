/*
  Warnings:

  - You are about to drop the column `parentAddOnId` on the `AddOn` table. All the data in the column will be lost.
  - You are about to drop the column `requiresInput` on the `AddOn` table. All the data in the column will be lost.
  - You are about to drop the column `addOnId` on the `AddOnPricing` table. All the data in the column will be lost.
  - You are about to drop the column `intervalEnd` on the `AddOnPricing` table. All the data in the column will be lost.
  - You are about to drop the column `intervalStart` on the `AddOnPricing` table. All the data in the column will be lost.
  - You are about to drop the column `addOnId` on the `BookingAddOn` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `BookingAddOn` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `BookingAddOn` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `BookingAddOn` table. All the data in the column will be lost.
  - Added the required column `addon_id` to the `AddOnPricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interval_start` to the `AddOnPricing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addon_id` to the `BookingAddOn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_id` to the `BookingAddOn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `BookingAddOn` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AddOn" DROP CONSTRAINT "AddOn_parentAddOnId_fkey";

-- DropForeignKey
ALTER TABLE "AddOnPricing" DROP CONSTRAINT "AddOnPricing_addOnId_fkey";

-- DropForeignKey
ALTER TABLE "BookingAddOn" DROP CONSTRAINT "BookingAddOn_addOnId_fkey";

-- DropForeignKey
ALTER TABLE "BookingAddOn" DROP CONSTRAINT "BookingAddOn_bookingId_fkey";

-- AlterTable
ALTER TABLE "AddOn" DROP COLUMN "parentAddOnId",
DROP COLUMN "requiresInput",
ADD COLUMN     "parent_addon_id" TEXT,
ADD COLUMN     "requires_input" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AddOnPricing" DROP COLUMN "addOnId",
DROP COLUMN "intervalEnd",
DROP COLUMN "intervalStart",
ADD COLUMN     "addon_id" TEXT NOT NULL,
ADD COLUMN     "interval_end" INTEGER,
ADD COLUMN     "interval_start" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BookingAddOn" DROP COLUMN "addOnId",
DROP COLUMN "bookingId",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "addon_id" TEXT NOT NULL,
ADD COLUMN     "booking_id" INTEGER NOT NULL,
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_parent_addon_id_fkey" FOREIGN KEY ("parent_addon_id") REFERENCES "AddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnPricing" ADD CONSTRAINT "AddOnPricing_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
