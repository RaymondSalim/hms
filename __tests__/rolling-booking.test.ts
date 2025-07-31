import {
    generateInitialBillsForRollingBooking,
    generateNextMonthlyBill,
    scheduleEndOfRollingBooking
} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {Bill, BillType, Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";

jest.mock('@/app/_lib/primsa', () => ({
  __esModule: true,
  default: {
    booking: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("Rolling Booking Feature", () => {
    // Mock data for our tests
    const mockBooking: Partial<Booking> = {
        id: 1,
        start_date: new Date("2024-07-05T00:00:00.000Z"),
        fee: new Prisma.Decimal(2000000),
        is_rolling: true,
        end_date: null
    };

    const mockBookingWithSecondResident: Partial<Booking> = {
        id: 2,
        start_date: new Date("2024-07-05T00:00:00.000Z"),
        fee: new Prisma.Decimal(2000000),
        second_resident_fee: new Prisma.Decimal(500000),
        is_rolling: true,
        end_date: null
    };

    const mockBookingWithDeposit: Partial<Booking> & { deposit?: { amount: Prisma.Decimal } } = {
        id: 3,
        start_date: new Date("2024-07-05T00:00:00.000Z"),
        fee: new Prisma.Decimal(2000000),
        is_rolling: true,
        end_date: null,
        deposit: { amount: new Prisma.Decimal(1000000) }
    };

    describe("generateInitialBillsForRollingBooking", () => {
        it("should generate a prorated bill for the first month and a full bill for the second month", async () => {
            const bills = await generateInitialBillsForRollingBooking(mockBooking as Booking);
            expect(bills).toHaveLength(2);

            // Bill for July (prorated)
            expect(bills[0].description).toBe("Tagihan untuk Bulan Juli 2024");
            expect(bills[0].bill_item).toBeDefined();
            // @ts-expect-error type
            expect(bills[0].bill_item?.create?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");
            // @ts-expect-error type
            expect(Number(bills[0].bill_item?.create?.[0].amount)).toBeCloseTo(1741935.48);
            // @ts-expect-error due_date toISOString type
            expect(bills[0].due_date.toISOString().split('T')[0]).toBe(new Date("2024-07-31T00:00:00.000Z").toISOString().split('T')[0]);

            // Bill for August (full month)
            expect(bills[1].description).toBe("Tagihan untuk Bulan Agustus 2024");
            expect(bills[1].bill_item).toBeDefined();
            // @ts-expect-error type
            expect(bills[1].bill_item?.create?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            // @ts-expect-error type
            expect(Number(bills[1].bill_item?.create?.[0].amount)).toBe(2000000);
            // @ts-expect-error due_date toISOString type
            expect(bills[1].due_date.toISOString().split('T')[0]).toBe(new Date("2024-08-31T00:00:00.000Z").toISOString().split('T')[0]);
        });

        it("should include second resident fee in bills when present", async () => {
            const bills = await generateInitialBillsForRollingBooking(mockBookingWithSecondResident as Booking);
            expect(bills).toHaveLength(2);

            // First bill should have both room fee and second resident fee
            const firstBillItems = bills[0].bill_item?.create;
            expect(firstBillItems).toHaveLength(2);
            // @ts-expect-error type
            expect(firstBillItems?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");
            // @ts-expect-error type
            expect(firstBillItems?.[1].description).toBe("Biaya Penghuni Kedua (5 Juli 2024 - 31 Juli 2024)");
            // @ts-expect-error type
            expect(Number(firstBillItems?.[0].amount)).toBeCloseTo(1741935.48);
            // @ts-expect-error type
            expect(Number(firstBillItems?.[1].amount)).toBeCloseTo(435483.87); // prorated second resident fee

            // Second bill should have both room fee and second resident fee
            const secondBillItems = bills[1].bill_item?.create;
            expect(secondBillItems).toHaveLength(2);
            // @ts-expect-error type
            expect(secondBillItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            // @ts-expect-error type
            expect(secondBillItems?.[1].description).toBe("Biaya Penghuni Kedua (1 Agustus 2024 - 31 Agustus 2024)");
            // @ts-expect-error type
            expect(Number(secondBillItems?.[0].amount)).toBe(2000000);
            // @ts-expect-error type
            expect(Number(secondBillItems?.[1].amount)).toBe(500000);
        });

        it("should include deposit in the first bill when present", async () => {
            const bills = await generateInitialBillsForRollingBooking(mockBookingWithDeposit);
            expect(bills).toHaveLength(2);

            // First bill should have room fee and deposit
            const firstBillItems = bills[0].bill_item?.create;
            expect(firstBillItems).toHaveLength(2);
            // @ts-expect-error type
            expect(firstBillItems?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");
            // @ts-expect-error type
            expect(firstBillItems?.[1].description).toBe("Deposit Kamar");
            // @ts-expect-error type
            expect(Number(firstBillItems?.[1].amount)).toBe(1000000);
            // @ts-expect-error type
            expect(firstBillItems?.[1].type).toBe(BillType.CREATED);

            // Second bill should only have room fee
            const secondBillItems = bills[1].bill_item?.create;
            expect(secondBillItems).toHaveLength(1);
            // @ts-expect-error type
            expect(secondBillItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
        });
    });

    describe("generateNextMonthlyBill (Cron Job Simulation)", () => {
        it("should not generate a bill for a month that is already billed", async () => {
            const existingBills: Partial<Bill>[] = [{
                description: "Tagihan untuk Bulan Agustus 2024",
                due_date: new Date("2024-08-31T00:00:00.000Z")
            }];
            const newBill = await generateNextMonthlyBill(mockBooking as Booking, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBill).toBeNull();
        });

        it("should generate a bill for the next month if it hasn't been billed yet", async () => {
            const existingBills: Partial<Bill>[] = [{
                description: "Tagihan untuk Bulan Agustus 2024",
                due_date: new Date("2024-08-31T00:00:00.000Z")
            }];
            const newBill = await generateNextMonthlyBill(mockBooking as Booking, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBill).not.toBeNull();
            expect(newBill?.description).toBe("Tagihan untuk Bulan September 2024");
            expect(newBill?.bill_item?.create?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(newBill?.bill_item?.create?.[0].amount)).toBe(2000000);
            // @ts-expect-error due_date toISOString type
            expect(newBill?.due_date.toISOString().split('T')[0]).toBe(new Date("2024-09-30T00:00:00.000Z").toISOString().split('T')[0]);
        });

        it("should include second resident fee in generated bills when present", async () => {
            const existingBills: Partial<Bill>[] = [{
                description: "Tagihan untuk Bulan Agustus 2024",
                due_date: new Date("2024-08-31T00:00:00.000Z")
            }];
            const newBill = await generateNextMonthlyBill(mockBookingWithSecondResident as Booking, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBill).not.toBeNull();
            
            const billItems = newBill?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(billItems?.[1].description).toBe("Biaya Penghuni Kedua (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(500000);
        });

        it("should not generate a bill if no existing bills are found", async () => {
            const newBill = await generateNextMonthlyBill(mockBooking as Booking, [], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBill).toBeNull();
        });
    });

    describe("scheduleEndOfRollingBooking", () => {
        it("should update the booking with the new end_date", async () => {
            const endDate = new Date("2024-10-31T00:00:00.000Z");
            const expectedBooking = { ...mockBooking, end_date: endDate, is_rolling: false };
            (prisma.booking.update as jest.Mock).mockResolvedValue(expectedBooking);

            const updatedBooking = await scheduleEndOfRollingBooking(mockBooking as Booking, endDate);
            expect(prisma.booking.update).toHaveBeenCalledWith({
                where: { id: mockBooking.id },
                data: { end_date: endDate, is_rolling: false }
            });
            expect(updatedBooking.end_date).not.toBeNull();
            expect(updatedBooking.end_date?.toISOString().split('T')[0]).toEqual(endDate.toISOString().split('T')[0]);
            expect(updatedBooking.is_rolling).toBe(false);
        });

        it("should not generate any more bills after the end_date has passed", async () => {
            const endedBooking = { ...mockBooking, end_date: new Date("2024-10-31T00:00:00.000Z") };
            const existingBills: Partial<Bill>[] = [{
                description: "Tagihan untuk Bulan Oktober 2024",
                due_date: new Date("2024-10-31T00:00:00.000Z")
            }];
            const newBill = await generateNextMonthlyBill(endedBooking as Booking, existingBills as Bill[], new Date("2024-11-01T00:00:00.000Z"));
            expect(newBill).toBeNull();
        });
    });
});
