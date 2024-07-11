/*
  Warnings:

  - A unique constraint covering the columns `[room_number,location_id]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "rooms_room_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "rooms_room_number_location_id_key" ON "rooms" ("room_number", "location_id");
