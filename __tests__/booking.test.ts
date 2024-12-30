import {prismaMock} from './singleton_prisma';
import {Duration, Prisma} from '@prisma/client';
import {createBooking, getAllBookings, getBookingByID, updateBookingByID} from "@/app/_db/bookings";
import {describe, expect, it} from "@jest/globals";

describe('Booking Actions', () => {
    describe('createBooking', () => {
        it('should create a booking with associated bills and add-ons', async () => {
            const startDate = new Date(2024, 11, 1);
            const mockBookingData = {
                fee: new Prisma.Decimal(1000),
                addOns: [{addon_id: 'addon-1', input: 'Extra bed', start_date: startDate}],
                start_date: startDate,
                tenant_id: 'tenant-1',
                room_id: 1,
                duration_id: 2,
                status_id: 1,
                custom_id: "#-1"
            };
            const mockDuration: Partial<Duration> = {id: 2, month_count: 3};
            const mockCreatedBooking = {id: 1, ...mockBookingData};

            // @ts-expect-error
            prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
            // @ts-expect-error
            prismaMock.booking.create.mockResolvedValue(mockCreatedBooking);

            // @ts-expect-error mockBookingData type
            const result = await createBooking(mockBookingData, mockDuration);

            expect(result.success).toEqual(mockCreatedBooking);
            expect(prismaMock.booking.create).toHaveBeenCalledWith({
                // data: expect.objectContaining({fee: "1000"}),
                data: expect.any(Object),
                include: expect.any(Object),
            });
            expect(prismaMock.bill.create).toHaveBeenCalledTimes(mockDuration.month_count!); // One for each month in duration
            // expect(prismaMock.bookingAddOn.create).toHaveBeenCalledTimes(1);
        });

        it('should handle prorated billing when start_date is not the first of the month', async () => {
            const mockBookingData = {
                fee: 1500,
                start_date: new Date(2024, 10, 15), // Nov 15, 2024
                tenant_id: 'tenant-1',
                room_id: 1,
                duration_id: 2,
            };
            // @ts-expect-error duration error type
            const mockDuration: Duration = {id: 2, month_count: 2};

            // @ts-expect-error
            prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
            // @ts-expect-error
            prismaMock.booking.create.mockResolvedValue(mockBookingData);

            // @ts-expect-error mockBookingData type
            await createBooking(mockBookingData, mockDuration);

            expect(prismaMock.bill.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        description: expect.stringContaining('PRORATA'),
                        amount: expect.any(Prisma.Decimal),
                    }),
                }),
            );
            expect(prismaMock.bill.create).toHaveBeenCalledTimes(mockDuration.month_count + 1); // One for each month in duration + prorata
        });
    });

    describe('updateBookingByID', () => {
        it('should update a booking with new bills and add-ons', async () => {
            const mockBookingID = 1;
            const startDate = new Date(2024, 11, 1);
            const mockData = {
                fee: 2000,
                addOns: [
                    // New
                    {
                        input: 'New Extra Bed 1',
                        start_date: startDate,
                        addon_id: 'addon-id-1',
                        booking_id: mockBookingID
                    },
                    {
                        input: 'New Extra Bed 2',
                        start_date: startDate,
                        addon_id: 'addon-id-1',
                        booking_id: mockBookingID
                    },
                    // Update
                    {
                        id: 'addon-2',
                        input: 'Extra bed 2',
                        start_date: startDate,
                        addon_id: 'addon-id-2',
                        booking_id: mockBookingID
                    },
                    {
                        id: 'addon-3',
                        input: 'Extra bed 3',
                        start_date: startDate,
                        addon_id: 'addon-id-2',
                        booking_id: mockBookingID
                    },
                ],
                start_date: startDate,
            };
            // @ts-expect-error duration error type
            const mockDuration: Duration = {id: 2, month_count: 3};

            // @ts-expect-error
            prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue({id: mockBookingID});
            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue([{paymentBills: [{id: 1}, {id: 2}]}, {paymentBills: [{id: 3}]}]);
            // @ts-expect-error
            prismaMock.payment.findMany.mockResolvedValue([]);
            // @ts-expect-error
            prismaMock.booking.update.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.bookingAddOn.findMany.mockResolvedValue([
                // To be updated
                {
                    id: 'addon-2',
                    input: 'Extra bed 2',
                    start_date: startDate,
                    addon_id: 'addon-id-1',
                    booking_id: mockBookingID
                },
                {
                    id: 'addon-3',
                    input: 'Extra bed 3',
                    start_date: startDate,
                    addon_id: 'addon-id-1',
                    booking_id: mockBookingID
                },
                // To be deleted
                {
                    id: 'addon-4',
                    input: 'Extra bed',
                    start_date: startDate,
                    addon_id: 'addon-id-1',
                    booking_id: mockBookingID
                },
                {
                    id: 'addon-5',
                    input: 'Extra bed',
                    start_date: startDate,
                    addon_id: 'addon-id-1',
                    booking_id: mockBookingID
                }
            ]);

            // @ts-expect-error mockData type
            const result = await updateBookingByID(mockBookingID, mockData, mockDuration);

            expect(result.success).toBeTruthy();
            expect(prismaMock.paymentBill.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: [1, 2, 3]
                    }
                }
            });
            expect(prismaMock.bill.deleteMany).toHaveBeenCalledWith({
                where: {
                    booking_id: mockBookingID
                }
            });
            expect(prismaMock.bill.create).toHaveBeenCalledTimes(mockDuration.month_count); // For new monthly bills
            expect(prismaMock.booking.update).toHaveBeenCalledTimes(1);

            expect(prismaMock.bookingAddOn.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: ['addon-4', 'addon-5']
                    }
                }
            });
            expect(prismaMock.bookingAddOn.update).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    id: "addon-2"
                }
            }));
            expect(prismaMock.bookingAddOn.update).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    id: "addon-3"
                }
            }));
            expect(prismaMock.bookingAddOn.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([expect.objectContaining({
                    input: "New Extra Bed 1"
                }), expect.objectContaining({
                    input: "New Extra Bed 2"
                })])
            });
        });

        it('should return failure if booking does not exist', async () => {
            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(null);

            // @ts-expect-error data error type
            const result = await updateBookingByID(999, {}, {id: 1, month_count: 2, day_count: null});

            expect(result.failure).toBe('Booking not found');
        });
    });

    describe('getAllBookings', () => {
        it('should retrieve all bookings matching the given filters', async () => {
            const mockBookings = [{id: 1}, {id: 2}];
            // @ts-expect-error
            prismaMock.booking.findMany.mockResolvedValue(mockBookings);

            const result = await getAllBookings(1, 2);

            expect(result).toEqual(mockBookings);
            expect(prismaMock.booking.findMany).toHaveBeenCalledWith({
                where: {
                    rooms: {
                        id: 2,
                        location_id: 1,
                    },
                },
                skip: undefined,
                take: undefined,
                include: expect.any(Object),
            });
        });
    });

    describe('getBookingByID', () => {
        it('should return booking by ID with specified include options', async () => {
            const mockBooking = {id: 1, tenant_id: 'tenant-1'};
            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);

            const result = await getBookingByID(1, {tenants: true});

            expect(result).toEqual(mockBooking);
            expect(prismaMock.booking.findFirst).toHaveBeenCalledWith({
                where: {id: 1},
                include: {tenants: true},
            });
        });

        it('should return null if no booking is found', async () => {
            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(null);

            const result = await getBookingByID(999);

            expect(result).toBeNull();
        });
    });
});