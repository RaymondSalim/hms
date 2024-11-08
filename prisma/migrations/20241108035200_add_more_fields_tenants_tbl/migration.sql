/*
  Warnings:

  - A unique constraint covering the columns `[second_resident_id]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "current_address" TEXT,
ADD COLUMN     "emergency_contact_name" VARCHAR(255),
ADD COLUMN     "emergency_contact_phone" VARCHAR(255),
ADD COLUMN     "id_file" VARCHAR(512),
ADD COLUMN     "id_number" VARCHAR(255) NOT NULL DEFAULT '0',
ADD COLUMN     "referral_source" TEXT,
ADD COLUMN     "second_resident_id" TEXT,
ADD COLUMN     "second_resident_relation" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_second_resident_id_key" ON "tenants"("second_resident_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_second_resident_id_fkey" FOREIGN KEY ("second_resident_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
