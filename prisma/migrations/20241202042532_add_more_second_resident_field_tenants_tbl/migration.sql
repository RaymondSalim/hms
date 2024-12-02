/*
  Warnings:

  - You are about to drop the column `second_resident_current_address` on the `tenants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "second_resident_current_address",
ADD COLUMN     "second_resident_id_file" VARCHAR(512),
ADD COLUMN     "second_resident_id_number" VARCHAR(255),
ALTER COLUMN "id_number" DROP DEFAULT;

UPDATE tenants AS parent
SET
    second_resident_id_number = child.id_number,
    second_resident_id_file = child.id_file
    FROM tenants AS child
WHERE parent.second_resident_id = child.id;
