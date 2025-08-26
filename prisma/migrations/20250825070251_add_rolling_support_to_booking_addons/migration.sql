-- AlterTable
ALTER TABLE "BookingAddOn" ADD COLUMN     "is_rolling" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "end_date" DROP NOT NULL;
