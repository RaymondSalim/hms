-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_duration_id_fkey";

-- DropForeignKey
ALTER TABLE "roomtypedurations" DROP CONSTRAINT "roomtypedurations_duration_id_fkey";

-- DropForeignKey
ALTER TABLE "roomtypedurations" DROP CONSTRAINT "roomtypedurations_room_type_id_fkey";

-- AddForeignKey
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_duration_id_fkey" FOREIGN KEY ("duration_id") REFERENCES "durations" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roomtypedurations"
    ADD CONSTRAINT "roomtypedurations_duration_id_fkey" FOREIGN KEY ("duration_id") REFERENCES "durations" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roomtypedurations"
    ADD CONSTRAINT "roomtypedurations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "roomtypes" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
