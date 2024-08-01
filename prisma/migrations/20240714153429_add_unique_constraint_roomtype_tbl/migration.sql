/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `roomtypes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "roomtypes_type_key" ON "roomtypes" ("type");
