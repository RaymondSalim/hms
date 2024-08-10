-- CreateTable
CREATE TABLE "checkinoutlogs"
(
    "id"         SERIAL       NOT NULL,
    "booking_id" INTEGER      NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "event_date" DATE         NOT NULL,
    "tenant_id"  TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkinoutlogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "checkinoutlogs"
    ADD CONSTRAINT "checkinoutlogs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "checkinoutlogs"
    ADD CONSTRAINT "checkinoutlogs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;
