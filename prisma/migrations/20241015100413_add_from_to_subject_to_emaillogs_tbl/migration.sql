/*
  Warnings:

  - Added the required column `from` to the `emaillogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `emaillogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to` to the `emaillogs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emaillogs" ADD COLUMN     "from" VARCHAR(255) NOT NULL,
ADD COLUMN     "subject" VARCHAR(255) NOT NULL,
ADD COLUMN     "to" VARCHAR(255) NOT NULL;
