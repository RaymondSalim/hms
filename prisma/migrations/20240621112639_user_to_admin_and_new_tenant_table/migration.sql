/*
  Warnings:

  - You are about to drop the column `user_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `logs` table. All the data in the column will be lost.
  - Added the required column `admin_id` to the `logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings"
    DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "logs"
    DROP CONSTRAINT "logs_user_id_fkey";

-- AlterTable
ALTER TABLE "bookings"
    DROP COLUMN "user_id",
    ADD COLUMN "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "logs"
    DROP COLUMN "user_id",
    ADD COLUMN "admin_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "tenants"
(
    "id"        TEXT         NOT NULL,
    "name"      VARCHAR(255) NOT NULL,
    "email"     VARCHAR(255),
    "phone"     VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logs"
    ADD CONSTRAINT "logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
