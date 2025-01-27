-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('GENERATED', 'CREATED');

-- AlterTable
ALTER TABLE "bill_items" ADD COLUMN     "type" "BillType" NOT NULL DEFAULT 'GENERATED';
