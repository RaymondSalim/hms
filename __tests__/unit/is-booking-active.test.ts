import {getNextUpcomingBooking, isBookingActive} from "@/app/_lib/util";

describe("isBookingActive", () => {
    it("should return true for active rolling booking", () => {
        const rollingBooking = {
            start_date: new Date("2024-01-01T00:00:00.000Z"),
            end_date: null,
            is_rolling: true
        };

        // Mock current date to be after start date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(rollingBooking)).toBe(true);

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return false for rolling booking before start date", () => {
        const rollingBooking = {
            start_date: new Date("2024-12-01T00:00:00.000Z"),
            end_date: null,
            is_rolling: true
        };

        // Mock current date to be before start date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(rollingBooking)).toBe(false);

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return false for rolling booking with end date", () => {
        const rollingBooking = {
            start_date: new Date("2024-01-01T00:00:00.000Z"),
            end_date: new Date("2024-06-30T00:00:00.000Z"),
            is_rolling: true
        };

        // Mock current date to be after start date but rolling booking has end date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(rollingBooking)).toBe(false);

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return true for active regular booking", () => {
        const regularBooking = {
            start_date: new Date("2024-07-01T00:00:00.000Z"),
            end_date: new Date("2024-07-31T00:00:00.000Z"),
            is_rolling: false
        };

        // Mock current date to be within booking period
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(regularBooking)).toBe(true);

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return false for regular booking without end date", () => {
        const regularBooking = {
            start_date: new Date("2024-07-01T00:00:00.000Z"),
            end_date: null,
            is_rolling: false
        };

        expect(isBookingActive(regularBooking)).toBe(false);
    });

    it("should return false for regular booking before start date", () => {
        const regularBooking = {
            start_date: new Date("2024-12-01T00:00:00.000Z"),
            end_date: new Date("2024-12-31T00:00:00.000Z"),
            is_rolling: false
        };

        // Mock current date to be before start date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(regularBooking)).toBe(false);

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return false for regular booking after end date", () => {
        const regularBooking = {
            start_date: new Date("2024-06-01T00:00:00.000Z"),
            end_date: new Date("2024-06-30T00:00:00.000Z"),
            is_rolling: false
        };

        // Mock current date to be after end date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        expect(isBookingActive(regularBooking)).toBe(false);

        // Restore original Date.now
        Date.now = originalNow;
    });
});

describe("getNextUpcomingBooking", () => {
    it("should return the earliest upcoming regular booking", () => {
        const bookings = [
            {
                id: 1,
                start_date: new Date("2024-12-01T00:00:00.000Z"),
                end_date: new Date("2024-12-31T00:00:00.000Z"),
                is_rolling: false
            },
            {
                id: 2,
                start_date: new Date("2024-08-01T00:00:00.000Z"),
                end_date: new Date("2024-08-31T00:00:00.000Z"),
                is_rolling: false
            },
            {
                id: 3,
                start_date: new Date("2024-09-01T00:00:00.000Z"),
                end_date: new Date("2024-09-30T00:00:00.000Z"),
                is_rolling: false
            }
        ];

        // Mock current date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        const result = getNextUpcomingBooking(bookings);
        expect(result?.id).toBe(2); // Should return the August booking (earliest)

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return the earliest upcoming rolling booking", () => {
        const bookings = [
            {
                id: 1,
                start_date: new Date("2024-12-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            },
            {
                id: 2,
                start_date: new Date("2024-08-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            },
            {
                id: 3,
                start_date: new Date("2024-09-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            }
        ];

        // Mock current date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        const result = getNextUpcomingBooking(bookings);
        expect(result?.id).toBe(2); // Should return the August booking (earliest)

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return the earliest upcoming booking from mixed regular and rolling bookings", () => {
        const bookings = [
            {
                id: 1,
                start_date: new Date("2024-12-01T00:00:00.000Z"),
                end_date: new Date("2024-12-31T00:00:00.000Z"),
                is_rolling: false
            },
            {
                id: 2,
                start_date: new Date("2024-08-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            },
            {
                id: 3,
                start_date: new Date("2024-07-01T00:00:00.000Z"),
                end_date: new Date("2024-07-31T00:00:00.000Z"),
                is_rolling: false
            }
        ];

        // Mock current date
        const originalNow = Date.now;
        const mockDate = new Date("2024-06-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        const result = getNextUpcomingBooking(bookings);
        expect(result?.id).toBe(3); // Should return the July booking (earliest)

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should exclude past bookings", () => {
        const bookings = [
            {
                id: 1,
                start_date: new Date("2024-06-01T00:00:00.000Z"),
                end_date: new Date("2024-06-30T00:00:00.000Z"),
                is_rolling: false
            },
            {
                id: 2,
                start_date: new Date("2024-05-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            },
            {
                id: 3,
                start_date: new Date("2024-08-01T00:00:00.000Z"),
                end_date: new Date("2024-08-31T00:00:00.000Z"),
                is_rolling: false
            }
        ];

        // Mock current date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        const result = getNextUpcomingBooking(bookings);
        expect(result?.id).toBe(3); // Should return the August booking (only future booking)

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should return null when no upcoming bookings exist", () => {
        const bookings = [
            {
                id: 1,
                start_date: new Date("2024-06-01T00:00:00.000Z"),
                end_date: new Date("2024-06-30T00:00:00.000Z"),
                is_rolling: false
            },
            {
                id: 2,
                start_date: new Date("2024-05-01T00:00:00.000Z"),
                end_date: null,
                is_rolling: true
            }
        ];

        // Mock current date
        const originalNow = Date.now;
        const mockDate = new Date("2024-07-15T00:00:00.000Z");
        Date.now = jest.fn(() => mockDate.getTime());

        const result = getNextUpcomingBooking(bookings);
        expect(result).toBeNull(); // Should return null when no future bookings

        // Restore original Date.now
        Date.now = originalNow;
    });

    it("should handle empty bookings array", () => {
        const bookings: Array<{
            id: number;
            start_date: Date;
            end_date?: Date | null;
            is_rolling?: boolean;
        }> = [];

        const result = getNextUpcomingBooking(bookings);
        expect(result).toBeNull();
    });
});
