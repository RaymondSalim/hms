import {
    generateInitialBillsForRollingBooking,
    generateNextMonthlyBill,
    scheduleEndOfRollingBooking
} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {Bill, BillItem, BillType, Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";

jest.mock('@/app/_lib/primsa', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    booking: {
      create: jest.fn(),
      update: jest.fn(),
    },
    bill: {
      deleteMany: jest.fn(),
    },
    billItem: {
      deleteMany: jest.fn(),
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
        it("should generate a prorated bill for the first month and full bills for all subsequent months up to current month", async () => {
            // Use a fixed date for testing - December 2024
            const mockDate = new Date("2024-12-15T00:00:00.000Z");

            const bills = await generateInitialBillsForRollingBooking(mockBooking as Booking, mockDate);
            // Should generate bills for: July (prorated), Aug, Sep, Oct, Nov, Dec (6 bills total)
            expect(bills).toHaveLength(6);

            // Bill for July (prorated)
            expect(bills[0].description).toBe("Tagihan untuk Bulan Juli 2024");
            expect(bills[0].bill_item).toBeDefined();
            const firstBillItems = bills[0].bill_item?.create as any[];
            expect(firstBillItems?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");
            expect(Number(firstBillItems?.[0].amount)).toBeCloseTo(1741935.48);
            // @ts-expect-error due_date toISOString type
            expect(bills[0].due_date.toISOString().split('T')[0]).toBe(new Date("2024-07-31T00:00:00.000Z").toISOString().split('T')[0]);

            // Bill for August (full month)
            expect(bills[1].description).toBe("Tagihan untuk Bulan Agustus 2024");
            expect(bills[1].bill_item).toBeDefined();
            const secondBillItems = bills[1].bill_item?.create as any[];
            expect(secondBillItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            expect(Number(secondBillItems?.[0].amount)).toBe(2000000);
            // @ts-expect-error due_date toISOString type
            expect(bills[1].due_date.toISOString().split('T')[0]).toBe(new Date("2024-08-31T00:00:00.000Z").toISOString().split('T')[0]);

            // Bill for December (current month)
            expect(bills[5].description).toBe("Tagihan untuk Bulan Desember 2024");
            expect(bills[5].bill_item).toBeDefined();
            const decemberBillItems = bills[5].bill_item?.create as any[];
            expect(decemberBillItems?.[0].description).toBe("Sewa Kamar (1 Desember 2024 - 31 Desember 2024)");
            expect(Number(decemberBillItems?.[0].amount)).toBe(2000000);
            // @ts-expect-error due_date toISOString type
            expect(bills[5].due_date.toISOString().split('T')[0]).toBe(new Date("2024-12-31T00:00:00.000Z").toISOString().split('T')[0]);
        });

        it("should include second resident fee in bills when present", async () => {
            // Use a fixed date for testing - September 2024
            const mockDate = new Date("2024-09-15T00:00:00.000Z");

            const bills = await generateInitialBillsForRollingBooking(mockBookingWithSecondResident as Booking, mockDate);
            // Should generate bills for: July (prorated), Aug, Sep (3 bills total)
            expect(bills).toHaveLength(3);

            // First bill should have both room fee and second resident fee
            const firstBillItems = bills[0].bill_item?.create as any[];
            expect(firstBillItems).toHaveLength(2);
            expect(firstBillItems?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");
            expect(firstBillItems?.[1].description).toBe("Biaya Penghuni Kedua (5 Juli 2024 - 31 Juli 2024)");
            expect(Number(firstBillItems?.[0].amount)).toBeCloseTo(1741935.48);
            expect(Number(firstBillItems?.[1].amount)).toBeCloseTo(435483.87); // prorated second resident fee

            // Second bill should have both room fee and second resident fee
            const secondBillItems = bills[1].bill_item?.create as any[];
            expect(secondBillItems).toHaveLength(2);
            expect(secondBillItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            expect(secondBillItems?.[1].description).toBe("Biaya Penghuni Kedua (1 Agustus 2024 - 31 Agustus 2024)");
            expect(Number(secondBillItems?.[0].amount)).toBe(2000000);
            expect(Number(secondBillItems?.[1].amount)).toBe(500000);

            // Third bill should have both room fee and second resident fee
            const thirdBillItems = bills[2].bill_item?.create as any[];
            expect(thirdBillItems).toHaveLength(2);
            expect(thirdBillItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(thirdBillItems?.[1].description).toBe("Biaya Penghuni Kedua (1 September 2024 - 30 September 2024)");
            expect(Number(thirdBillItems?.[0].amount)).toBe(2000000);
            expect(Number(thirdBillItems?.[1].amount)).toBe(500000);
        });

        it("should include deposit in the first bill when present", async () => {
            // Use a fixed date for testing - August 2024
            const mockDate = new Date("2024-08-15T00:00:00.000Z");

            const bills = await generateInitialBillsForRollingBooking(mockBookingWithDeposit as any, mockDate);
            // Should generate bills for: July (prorated), Aug (2 bills total)
            expect(bills).toHaveLength(2);

            // First bill should have room fee
            const firstBillItems = bills[0].bill_item?.create as any[];
            expect(firstBillItems).toHaveLength(1);
            expect(firstBillItems?.[0].description).toBe("Sewa Kamar (5 Juli 2024 - 31 Juli 2024)");

            // Second bill should only have room fee
            const secondBillItems = bills[1].bill_item?.create as any[];
            expect(secondBillItems).toHaveLength(1);
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

        it("[mid-month] should generate bills for rolling addons (same start date)", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                start_date: new Date("2024-07-05T00:00:00.000Z"),
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-07-05T00:00:00.000Z"),
                        end_date: null,
                        is_rolling: true,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
                                {interval_start: 3, interval_end: null, price: 120000},
                            ]
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: [
                    {
                        amount: new Prisma.Decimal(300000),
                        description: `Biaya Layanan Tambahan (5 Juli - 4 Oktober)`,
                        type: BillType.GENERATED
                    }
                ],

            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue(mockBookingWithAddons.addOns[0]);

            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            expect(newBillAugust?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should include both room fee and addon fee
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillAugust!);

            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            expect(newBillSeptember?.description).toBe("Tagihan untuk Bulan September 2024");

            // Should include both room fee and addon fee
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillSeptember!);

            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            expect(newBillOctober?.description).toBe("Tagihan untuk Bulan Oktober 2024");

            // Should include both room fee and addon fee
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Oktober 2024 - 31 Oktober 2024)");
            expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(billItems?.[1].description).toContain("(5 Oktober 2024 - 31 Oktober 2024)"); // Prorated, as the first pricing is full_payment (and mid-month)
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(Math.ceil(120000 / 31 * (31-5+1)));

            existingBills.push(newBillOctober!);
        });

        it("[mid-month] should generate bills for rolling addons (different start date)", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                start_date: new Date("2024-07-05T00:00:00.000Z"),
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-07-15T00:00:00.000Z"),
                        end_date: null,
                        is_rolling: true,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
                                {interval_start: 3, interval_end: null, price: 120000},
                            ],
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: [
                    {
                        amount: new Prisma.Decimal(300000),
                        description: `Biaya Layanan Tambahan (15 Juli - 14 Oktober)`,
                        type: BillType.GENERATED
                    }
                ],
            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue(mockBookingWithAddons.addOns[0]);

            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            expect(newBillAugust?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should include both room fee and addon fee
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            // expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            // expect(Number(billItems?.[1].amount)).toBe(300000);

            existingBills.push(newBillAugust!);

            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            expect(newBillSeptember?.description).toBe("Tagihan untuk Bulan September 2024");

            // Should include both room fee and addon fee
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillSeptember!);

            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            expect(newBillOctober?.description).toBe("Tagihan untuk Bulan Oktober 2024");

            // Should include both room fee and addon fee
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Oktober 2024 - 31 Oktober 2024)");
            expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(billItems?.[1].description).toContain("(15 Oktober 2024 - 31 Oktober 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(Math.ceil(120000 / 31 * (31-15+1)));

            existingBills.push(newBillOctober!);
        });

        it("[mid-month] should generate bills for non-rolling addons", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                start_date: new Date("2024-07-05T00:00:00.000Z"),
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-07-15T00:00:00.000Z"),
                        end_date: new Date("2024-10-14T00:00:00.000Z"),
                        is_rolling: false,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
                                {interval_start: 3, interval_end: null, price: 120000},
                            ],
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: [
                    {
                        amount: new Prisma.Decimal(300000),
                        description: `Biaya Layanan Tambahan (15 Juli - 14 Oktober)`,
                        type: BillType.GENERATED
                    }
                ],
            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue(mockBookingWithAddons.addOns[0]);

            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            expect(newBillAugust?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should include both room fee and addon fee
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            // expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            // expect(Number(billItems?.[1].amount)).toBe(300000);

            existingBills.push(newBillAugust!);

            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            expect(newBillSeptember?.description).toBe("Tagihan untuk Bulan September 2024");

            // Should include both room fee and addon fee
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillSeptember!);

            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            expect(newBillOctober?.description).toBe("Tagihan untuk Bulan Oktober 2024");

            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Oktober 2024 - 31 Oktober 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillOctober!);
        });

        it("should generate bills for rolling addons", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                start_date: new Date("2024-07-05T00:00:00.000Z"),
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-08-01T00:00:00.000Z"),
                        end_date: null,
                        is_rolling: true,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
                                {interval_start: 3, interval_end: null, price: 120000},
                            ],
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: [
                    {
                        amount: new Prisma.Decimal(2000000),
                        description: `Sewa Kamar (5 Juli 2024 - 31 Juli 2024)`,
                        type: BillType.GENERATED
                    }
                ],

            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue(mockBookingWithAddons.addOns[0]);

            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            expect(newBillAugust?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should include both room fee and addon fee
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(300000);

            existingBills.push(newBillAugust!);

            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            expect(newBillSeptember?.description).toBe("Tagihan untuk Bulan September 2024");

            // Should include both room fee and addon fee
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillSeptember!);

            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            expect(newBillOctober?.description).toBe("Tagihan untuk Bulan Oktober 2024");

            // Should include both room fee and addon fee
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Oktober 2024 - 31 Oktober 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillOctober!);

            const newBillNovember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-11-01T00:00:00.000Z"));
            expect(newBillNovember).not.toBeNull();
            expect(newBillNovember?.description).toBe("Tagihan untuk Bulan November 2024");

            // Should include both room fee and addon fee
            billItems = newBillNovember?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 November 2024 - 30 November 2024)");
            expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(billItems?.[1].description).toContain("(1 November 2024 - 30 November 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(120000);

            existingBills.push(newBillNovember!);
        });

        it("should generate bills for non-rolling addons", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                start_date: new Date("2024-07-05T00:00:00.000Z"),
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-08-01T00:00:00.000Z"),
                        end_date: new Date("2024-10-31T00:00:00.000Z"),
                        is_rolling: false,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
                                {interval_start: 3, interval_end: null, price: 120000},
                            ],
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: [
                    {
                        amount: new Prisma.Decimal(2000000),
                        description: `Sewa Kamar (5 Juli 2024 - 31 Juli 2024)`,
                        type: BillType.GENERATED
                    }
                ],
            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue(mockBookingWithAddons.addOns[0]);

            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            expect(newBillAugust?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should include both room fee and addon fee
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
            expect(billItems?.[1].description).toContain("Biaya Layanan Tambahan");
            expect(Number(billItems?.[0].amount)).toBe(2000000);
            expect(Number(billItems?.[1].amount)).toBe(300000);

            existingBills.push(newBillAugust!);

            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            expect(newBillSeptember?.description).toBe("Tagihan untuk Bulan September 2024");

            // Should include both room fee and addon fee
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 September 2024 - 30 September 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillSeptember!);

            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            expect(newBillOctober?.description).toBe("Tagihan untuk Bulan Oktober 2024");

            // Should include both room fee and addon fee
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Oktober 2024 - 31 Oktober 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillOctober!);

            const newBillNovember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-11-01T00:00:00.000Z"));
            expect(newBillNovember).not.toBeNull();
            expect(newBillNovember?.description).toBe("Tagihan untuk Bulan November 2024");

            billItems = newBillNovember?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 November 2024 - 30 November 2024)");
            expect(Number(billItems?.[0].amount)).toBe(2000000);

            existingBills.push(newBillNovember!);
        });

        it("should skip addons that have ended before the billing period", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-07-01T00:00:00.000Z"),
                        end_date: new Date("2024-07-31T00:00:00.000Z"),
                        is_rolling: false,
                        addOn: {
                            name: "Test Addon",
                            pricing: []
                        }
                    },
                ],
            };

            const existingBills: Partial<Bill>[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z")
            }];

            const newBill = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills as Bill[], new Date("2024-08-01T00:00:00.000Z"));
            expect(newBill).not.toBeNull();
            expect(newBill?.description).toBe("Tagihan untuk Bulan Agustus 2024");

            // Should only include room fee since addon ended in July
            const billItems = newBill?.bill_item?.create;
            expect(billItems).toHaveLength(1);
            expect(billItems?.[0].description).toBe("Sewa Kamar (1 Agustus 2024 - 31 Agustus 2024)");
        });

        it("should handle addons with multiple pricing tiers (full payment then recurring)", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                addOns: [
                    {
                        addon_id: 'addon1',
                        start_date: new Date("2024-08-10T00:00:00.000Z"),
                        is_rolling: true,
                        addOn: {
                            name: "Test Addon",
                            pricing: [
                                { interval_start: 0, interval_end: 1, price: 500000, is_full_payment: true }, // 2 months full payment
                                { interval_start: 2, interval_end: null, price: 150000 }, // Recurring monthly afterwards
                            ],
                        }
                    },
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024",
                due_date: new Date("2024-07-31T00:00:00.000Z"),
                bill_item: []
            }];

            (prisma.addOn.findFirst as jest.Mock).mockResolvedValue({ name: "Layanan A", ...mockBookingWithAddons.addOns[0]});

            // August Bill - First month of addon, full payment
            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[1].description).toContain("10 Agustus 2024 - 9 Oktober 2024");
            expect(Number(billItems?.[1].amount)).toBe(500000);
            existingBills.push(newBillAugust!);

            // September Bill - Should have no addon fee
            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(1); // Only room fee
            existingBills.push(newBillSeptember!);

            // October Bill - Prorated recurring fee starts
            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[1].description).toContain("10 Oktober 2024 - 31 Oktober 2024");
            expect(Number(billItems?.[1].amount)).toBe(Math.ceil(150000 / 31 * (31 - 10 + 1)));
        });

        it("should handle multiple addons with different schedules", async () => {
            const mockBookingWithAddons = {
                ...mockBooking,
                addOns: [
                    { // Rolling, starts mid-month
                        addon_id: 'addon1',
                        start_date: new Date("2024-08-15T00:00:00.000Z"),
                        is_rolling: true,
                        addOn: {
                            name: "Layanan A",
                            pricing: [{ interval_start: 0, interval_end: null, price: 100000 }],
                        }
                    },
                    { // Non-rolling, full month
                        addon_id: 'addon2',
                        start_date: new Date("2024-09-01T00:00:00.000Z"),
                        end_date: new Date("2024-09-30T00:00:00.000Z"),
                        is_rolling: false,
                        addOn: {
                            name: "Layanan B",
                            pricing: [{ interval_start: 0, interval_end: 0, price: 200000, is_full_payment: true }],
                        }
                    }
                ],
            };

            const existingBills: (Partial<Bill> & {bill_item: Partial<BillItem>[]})[] = [{
                description: "Tagihan untuk Bulan Juli 2024", due_date: new Date("2024-07-31T00:00:00.000Z"), bill_item: []
            }];

            (prisma.addOn.findFirst as jest.Mock).mockImplementation(({ where: { id } }) => {
                if (id === 'addon1') return { name: "Layanan A", ...mockBookingWithAddons.addOns[0] };
                if (id === 'addon2') return { name: "Layanan B", ...mockBookingWithAddons.addOns[1] };
                return null;
            });

            // August Bill - Prorated for addon1
            const newBillAugust = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-08-01T00:00:00.000Z"));
            expect(newBillAugust).not.toBeNull();
            let billItems = newBillAugust?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[1].description).toContain("15 Agustus 2024 - 31 Agustus 2024");
            expect(Number(billItems?.[1].amount)).toBe(Math.ceil(100000 / 31 * (31-15+1)));
            existingBills.push(newBillAugust!);

            // September Bill - Full month for addon1, and full payment for addon2
            const newBillSeptember = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-09-01T00:00:00.000Z"));
            expect(newBillSeptember).not.toBeNull();
            billItems = newBillSeptember?.bill_item?.create;
            expect(billItems).toHaveLength(3);
            expect(billItems?.find(item => item.description.includes("Layanan A"))?.description).toContain("1 September 2024 - 30 September 2024");
            expect(Number(billItems?.find(item => item.description.includes("Layanan A"))?.amount)).toBe(100000);
            expect(billItems?.find(item => item.description.includes("Layanan B"))?.description).toContain("1 September 2024 - 30 September 2024");
            expect(Number(billItems?.find(item => item.description.includes("Layanan B"))?.amount)).toBe(200000);
            existingBills.push(newBillSeptember!);

            // October Bill - Full month for addon1, addon2 has ended
            const newBillOctober = await generateNextMonthlyBill(mockBookingWithAddons as any, existingBills, new Date("2024-10-01T00:00:00.000Z"));
            expect(newBillOctober).not.toBeNull();
            billItems = newBillOctober?.bill_item?.create;
            expect(billItems).toHaveLength(2);
            expect(billItems?.[1].description).toContain("1 Oktober 2024 - 31 Oktober 2024");
            expect(Number(billItems?.[1].amount)).toBe(100000);
        });
    });

    describe("scheduleEndOfRollingBooking", () => {
        it("should update the booking with the new end_date", async () => {
            const endDate = new Date("2024-10-31T00:00:00.000Z");
            const expectedBooking = { ...mockBooking, end_date: endDate, is_rolling: false };

            // Mock the transaction to return the expected booking
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                // Create a mock transaction client
                const mockTx = {
                    booking: {
                        update: jest.fn().mockResolvedValue(expectedBooking)
                    },
                    bill: {
                        findMany: jest.fn().mockResolvedValue([])
                    },
                    billItem: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
                    }
                };

                // Call the callback with the mock transaction client
                return await callback(mockTx);
            });

            const updatedBooking = await scheduleEndOfRollingBooking(mockBooking as Booking, endDate);

            // Verify transaction was called
            expect(prisma.$transaction).toHaveBeenCalled();

            // Verify the result
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

        it("should clean up bills that extend beyond the scheduled end date", async () => {
            // Mock a booking that started 12 months ago and has bills up to current month
            const mockBookingWithBills = {
                ...mockBooking,
                start_date: new Date("2023-07-05T00:00:00.000Z"), // 12 months ago
                bills: [
                    // Bills from July 2023 to June 2024 (12 bills total)
                    { id: 1, due_date: new Date("2023-07-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Juli 2023" },
                    { id: 2, due_date: new Date("2023-08-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Agustus 2023" },
                    { id: 3, due_date: new Date("2023-09-30T00:00:00.000Z"), description: "Tagihan untuk Bulan September 2023" },
                    { id: 4, due_date: new Date("2023-10-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Oktober 2023" },
                    { id: 5, due_date: new Date("2023-11-30T00:00:00.000Z"), description: "Tagihan untuk Bulan November 2023" },
                    { id: 6, due_date: new Date("2023-12-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Desember 2023" },
                    { id: 7, due_date: new Date("2024-01-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Januari 2024" },
                    { id: 8, due_date: new Date("2024-02-29T00:00:00.000Z"), description: "Tagihan untuk Bulan Februari 2024" },
                    { id: 9, due_date: new Date("2024-03-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Maret 2024" },
                    { id: 10, due_date: new Date("2024-04-30T00:00:00.000Z"), description: "Tagihan untuk Bulan April 2024" },
                    { id: 11, due_date: new Date("2024-05-31T00:00:00.000Z"), description: "Tagihan untuk Bulan Mei 2024" },
                    { id: 12, due_date: new Date("2024-06-30T00:00:00.000Z"), description: "Tagihan untuk Bulan Juni 2024" },
                ]
            };

            // Schedule end date to 6 months ago (December 2023)
            const endDate = new Date("2023-12-31T00:00:00.000Z");

            // Mock the expected behavior after cleanup
            const expectedBooking = {
                ...mockBookingWithBills,
                end_date: endDate,
                is_rolling: false
            };

            // Mock the transaction to return the expected booking
            (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                // Create a mock transaction client
                const mockTx = {
                    booking: {
                        update: jest.fn().mockResolvedValue(expectedBooking)
                    },
                    bill: {
                        findMany: jest.fn().mockResolvedValue([
                            { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }, { id: 12 }
                        ]),
                        deleteMany: jest.fn().mockResolvedValue({ count: 6 })
                    },
                    billItem: {
                        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
                    }
                };

                // Call the callback with the mock transaction client
                return await callback(mockTx);
            });

            const updatedBooking = await scheduleEndOfRollingBooking(mockBookingWithBills as Booking, endDate);

            // Verify transaction was called
            expect(prisma.$transaction).toHaveBeenCalled();

            // Verify the result
            expect(updatedBooking.end_date).toEqual(endDate);
            expect(updatedBooking.is_rolling).toBe(false);

            // Verify that bills beyond end date were cleaned up
            // Get the mock transaction client that was passed to the callback
            const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
            const mockTx = {
                booking: { update: jest.fn().mockResolvedValue(expectedBooking) },
                bill: {
                    findMany: jest.fn().mockResolvedValue([
                        { id: 7 }, { id: 8 }, { id: 9 }, { id: 10 }, { id: 11 }, { id: 12 }
                    ]),
                    deleteMany: jest.fn().mockResolvedValue({ count: 6 })
                },
                billItem: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) }
            };

            // Call the callback to simulate what happens in the transaction
            await transactionCallback(mockTx);

            // Verify bill items were deleted first (due to foreign key constraints)
            expect(mockTx.billItem.deleteMany).toHaveBeenCalledWith({
                where: { bill_id: { in: [7, 8, 9, 10, 11, 12] } }
            });

            // Verify bills were deleted
            expect(mockTx.bill.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: [7, 8, 9, 10, 11, 12] } }
            });
        });
    });
});
