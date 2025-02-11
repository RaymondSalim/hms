-- AlterTable
ALTER TABLE "bill_items" ADD COLUMN     "related_id" TEXT;

-- AlterTable
ALTER TABLE "guests" ALTER COLUMN "booking_id" DROP DEFAULT;
