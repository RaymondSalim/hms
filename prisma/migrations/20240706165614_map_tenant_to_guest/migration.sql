/*
  Warnings:

  - Added the required column `tenant_id` to the `guests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "guests"
    ADD COLUMN "tenant_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "guests"
    ADD CONSTRAINT "guests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
