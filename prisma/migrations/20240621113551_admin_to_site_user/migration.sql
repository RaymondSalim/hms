/*
  Warnings:

  - You are about to drop the column `admin_id` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guestbookings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `site_user_id` to the `logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounts"
    DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "admins"
    DROP CONSTRAINT "admins_role_id_fkey";

-- DropForeignKey
ALTER TABLE "guestbookings"
    DROP CONSTRAINT "guestbookings_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "guestbookings"
    DROP CONSTRAINT "guestbookings_guest_id_fkey";

-- DropForeignKey
ALTER TABLE "logs"
    DROP CONSTRAINT "logs_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions"
    DROP CONSTRAINT "sessions_userId_fkey";

-- AlterTable
ALTER TABLE "logs"
    DROP COLUMN "admin_id",
    ADD COLUMN "site_user_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "admins";

-- DropTable
DROP TABLE "guestbookings";

-- CreateTable
CREATE TABLE "siteusers"
(
    "id"            TEXT         NOT NULL,
    "name"          TEXT,
    "email"         TEXT         NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password"      TEXT         NOT NULL,
    "image"         TEXT,
    "role_id"       INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siteusers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siteusers_email_key" ON "siteusers" ("email");

-- AddForeignKey
ALTER TABLE "logs"
    ADD CONSTRAINT "logs_site_user_id_fkey" FOREIGN KEY ("site_user_id") REFERENCES "siteusers" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "siteusers"
    ADD CONSTRAINT "siteusers_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "siteusers" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "siteusers" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
