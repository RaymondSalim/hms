-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_room_type_id_fkey";

-- AddForeignKey
ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "roomtypes" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
