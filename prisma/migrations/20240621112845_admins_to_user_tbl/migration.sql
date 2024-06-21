/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "accounts"
    DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "logs"
    DROP CONSTRAINT "logs_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions"
    DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "users"
    DROP CONSTRAINT "users_role_id_fkey";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "admins"
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

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins" ("email");

-- AddForeignKey
ALTER TABLE "logs"
    ADD CONSTRAINT "logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admins"
    ADD CONSTRAINT "admins_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
