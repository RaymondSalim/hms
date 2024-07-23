/*
  Warnings:

  - A unique constraint covering the columns `[room_type_id,duration_id,location_id]` on the table `roomtypedurations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `location_id` to the `roomtypedurations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "roomtypedurations_room_type_id_duration_id_key";

-- AlterTable
ALTER TABLE "roomtypedurations"
    ADD COLUMN "location_id" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "roomtypedurations_room_type_id_duration_id_location_id_key" ON "roomtypedurations" ("room_type_id", "duration_id", "location_id");

-- AddForeignKey
ALTER TABLE "roomtypedurations"
    ADD CONSTRAINT "roomtypedurations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
