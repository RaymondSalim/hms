-- DropForeignKey
ALTER TABLE "BookingAddOn" DROP CONSTRAINT "BookingAddOn_booking_id_fkey";

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
