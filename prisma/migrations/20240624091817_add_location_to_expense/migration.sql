-- AlterTable
ALTER TABLE "expenses"
    ADD COLUMN "location_id" INTEGER;

-- AddForeignKey
ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
