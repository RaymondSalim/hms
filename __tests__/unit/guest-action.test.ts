import {describe, expect, it} from "@jest/globals";
import {GuestStay, Prisma} from "@prisma/client";
import {
    generateBillItemsFromGuestStays,
    splitGuestStayByMonth
} from "@/app/(internal)/(dashboard_layout)/residents/guests/guest-action";

describe("splitGuestStayByMonth", () => {
    const toUTCDate = (year: number, month: number, day: number) =>
        new Date(Date.UTC(year, month, day, 0, 0, 0));

    it("should split a stay spanning multiple months into separate stays", async () => {
        const guestStay: GuestStay = {
            id: 1,
            guest_id: 123,
            start_date: toUTCDate(2025, 0, 1),  // 1 Jan 2025
            end_date: toUTCDate(2025, 4, 15),   // 15 May 2025
            daily_fee: new Prisma.Decimal(50000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await splitGuestStayByMonth(guestStay);

        expect(result).toHaveLength(5);

        expect(result[0]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 0, 1),
                end_date: toUTCDate(2025, 0, 31),
                daily_fee: new Prisma.Decimal(50000),
                total_fee: new Prisma.Decimal(1550000)
            })
        );
        expect(result[1]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 1, 1),
                end_date: toUTCDate(2025, 1, 28),
                daily_fee: new Prisma.Decimal(50000),
                total_fee: new Prisma.Decimal(1400000)
            })
        );
        expect(result[2]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 2, 1),
                end_date: toUTCDate(2025, 2, 31),
                daily_fee: new Prisma.Decimal(50000),
                total_fee: new Prisma.Decimal(1550000)
            })
        );
        expect(result[3]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 3, 1),
                end_date: toUTCDate(2025, 3, 30),
                daily_fee: new Prisma.Decimal(50000),
                total_fee: new Prisma.Decimal(1500000)
            })
        );
        expect(result[4]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 4, 1),
                end_date: toUTCDate(2025, 4, 15),
                daily_fee: new Prisma.Decimal(50000),
                total_fee: new Prisma.Decimal(750000)
            })
        );
    });

    it("should return a single stay if it does not span multiple months", async () => {
        const guestStay: GuestStay = {
            id: 2,
            guest_id: 456,
            start_date: toUTCDate(2025, 2, 5),  // 5 March 2025
            end_date: toUTCDate(2025, 2, 25),   // 25 March 2025
            daily_fee: new Prisma.Decimal(70000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await splitGuestStayByMonth(guestStay);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 2, 5),
                end_date: toUTCDate(2025, 2, 25),
                daily_fee: new Prisma.Decimal(70000),
                total_fee: new Prisma.Decimal(1470000)
            })
        );
    });

    it("should handle a stay starting mid-month and ending mid-next month", async () => {
        const guestStay: GuestStay = {
            id: 3,
            guest_id: 789,
            start_date: toUTCDate(2025, 1, 15),  // 15 Feb 2025
            end_date: toUTCDate(2025, 2, 10),   // 10 March 2025
            daily_fee: new Prisma.Decimal(60000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await splitGuestStayByMonth(guestStay);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 1, 15),
                end_date: toUTCDate(2025, 1, 28),
                daily_fee: new Prisma.Decimal(60000),
                total_fee: new Prisma.Decimal(840000),
            })
        );
        expect(result[1]).toEqual(
            expect.objectContaining({
                start_date: toUTCDate(2025, 2, 1),
                end_date: toUTCDate(2025, 2, 10),
                daily_fee: new Prisma.Decimal(60000),
                total_fee: new Prisma.Decimal(600000),
            })
        );
    });
});

describe("generateBillItemsFromGuestStays", () => {
    it("should generate bill items for guest stays spanning multiple months", async () => {
        const guestStay: GuestStay = {
            id: 1,
            guest_id: 1001,
            start_date: new Date(Date.UTC(2025, 0, 10)), // January 10, 2025
            end_date: new Date(Date.UTC(2025, 2, 15)), // March 15, 2025
            daily_fee: new Prisma.Decimal(50000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const guest = { id: guestStay.guest_id };

        const result = await generateBillItemsFromGuestStays([guestStay]);

        expect(result.size).toBe(3);

        expect(result.get("2025-0")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (January 10 - January 31)",
                amount: new Prisma.Decimal(50_000 * 22), // 22 days
            }),
        ]);

        expect(result.get("2025-1")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (February 1 - February 28)",
                amount: new Prisma.Decimal(50_000 * 28), // Full month
            }),
        ]);

        expect(result.get("2025-2")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (March 1 - March 15)",
                amount: new Prisma.Decimal(50_000 * 15), // 15 days
            }),
        ]);
    });

    it("should handle a guest stay that fits entirely within one month", async () => {
        const guestStay: GuestStay = {
            id: 2,
            guest_id: 1002,
            start_date: new Date(Date.UTC(2025, 4, 5)), // May 5, 2025
            end_date: new Date(Date.UTC(2025, 4, 20)), // May 20, 2025
            daily_fee: new Prisma.Decimal(75_000),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const guest = { id: guestStay.guest_id };

        const result = await generateBillItemsFromGuestStays([guestStay]);

        expect(result.size).toBe(1);

        expect(result.get("2025-4")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (May 5 - May 20)",
                amount: new Prisma.Decimal(75_000 * 16), // 16 days
            }),
        ]);
    });

    it("should handle multiple guest stays correctly", async () => {
        const guestStays: GuestStay[] = [
            {
                id: 3,
                guest_id: 1003,
                start_date: new Date(Date.UTC(2025, 5, 1)), // June 1, 2025
                end_date: new Date(Date.UTC(2025, 5, 30)), // June 30, 2025
                daily_fee: new Prisma.Decimal(100_000),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 4,
                guest_id: 1003,
                start_date: new Date(Date.UTC(2025, 6, 10)), // July 10, 2025
                end_date: new Date(Date.UTC(2025, 6, 20)), // July 20, 2025
                daily_fee: new Prisma.Decimal(80_000),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];

        const guest = { id: guestStays[0].guest_id };

        const result = await generateBillItemsFromGuestStays(guestStays);

        expect(result.size).toBe(2);

        expect(result.get("2025-5")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (June 1 - June 30)",
                amount: new Prisma.Decimal(100_000 * 30), // Full month
            }),
        ]);

        expect(result.get("2025-6")).toEqual([
            expect.objectContaining({
                description: "Biaya Menginap Tamu Tambahan (July 10 - July 20)",
                amount: new Prisma.Decimal(80_000 * 11), // 11 days
            }),
        ]);
    });
});