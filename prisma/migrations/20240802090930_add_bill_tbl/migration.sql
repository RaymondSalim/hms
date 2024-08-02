-- CreateTable
CREATE TABLE "bills"
(
    "id"          SERIAL         NOT NULL,
    "booking_id"  INTEGER        NOT NULL,
    "amount"      DECIMAL(10, 2) NOT NULL,
    "description" VARCHAR(255)   NOT NULL,
    "due_date"    DATE           NOT NULL,
    "paid"        BOOLEAN        NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bills"
    ADD CONSTRAINT "bills_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
