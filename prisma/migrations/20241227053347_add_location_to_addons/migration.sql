-- AlterTable
ALTER TABLE "AddOn" ADD COLUMN     "location_id" INTEGER;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
