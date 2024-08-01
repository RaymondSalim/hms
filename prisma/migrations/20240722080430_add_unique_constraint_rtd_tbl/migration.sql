/*
  Warnings:

  - A unique constraint covering the columns `[room_type_id,duration_id]` on the table `roomtypedurations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "roomtypedurations_room_type_id_duration_id_key" ON "roomtypedurations" ("room_type_id", "duration_id");
