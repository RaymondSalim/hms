-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "second_resident_current_address" TEXT,
ADD COLUMN     "second_resident_email" VARCHAR(255),
ADD COLUMN     "second_resident_name" VARCHAR(255),
ADD COLUMN     "second_resident_phone" VARCHAR(255);
