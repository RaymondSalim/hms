import {prismaMock} from './singleton_prisma';
import {
    AddOnPricing,
    Bill,
    BillItem,
    BillType,
    BookingAddOn,
    Deposit,
    DepositStatus,
    Duration,
    Payment,
    Prisma
} from '@prisma/client';
import {
    BookingsIncludeAddons,
    createBooking,
    getAllBookings,
    getBookingByID,
    updateBookingByID
} from "@/app/_db/bookings";
import {describe, expect, it} from "@jest/globals";
import {AddonIncludePricing} from "@/app/(internal)/(dashboard_layout)/addons/addons-action";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

describe('Booking Actions', () => {
    describe('createBooking', () => {
        it('should create a booking with associated bills and add-ons', async () => {
            const startDate = new Date(2024, 11, 1);

            const internetAddonPricing: AddOnPricing[] = [
                {
                    id: '0', interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true,
                    addon_id: 'addon-1',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: '0', interval_start: 3, interval_end: null, price: 120000,
                    addon_id: 'addon-1',
                    is_full_payment: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
            ];
            const internetAddon: Partial<AddonIncludePricing> = {
                id: 'addon-1',
                name: 'Internet',
                pricing: internetAddonPricing,
            };

            const internetBookingAddon: BookingAddOn = {
                start_date: startDate,
                end_date: new Date(2025, 1, 28),
                booking_id: 1,
                addon_id: 'addon-1',
                id: '',
                input: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockDepositData: Partial<OmitIDTypeAndTimestamp<Deposit>> = {
                amount: new Prisma.Decimal(500),
                status: DepositStatus.UNPAID,
            };

            const mockBookingData: Omit<BookingsIncludeAddons, "id" | "createdAt" | "updatedAt" | "end_date"> = {
                fee: new Prisma.Decimal(1000),
                addOns: [internetBookingAddon],
                start_date: startDate,
                tenant_id: 'tenant-1',
                room_id: 1,
                duration_id: 2,
                status_id: 1,
                custom_id: "#-1",
                second_resident_fee: null,
                // @ts-expect-error deposit not part of BookingsIncludeAddons
                deposit: mockDepositData,
            };
            const mockDuration: Partial<Duration> = {id: 2, month_count: 3};
            const mockCreatedBooking = {id: 1, ...mockBookingData};

            // @ts-expect-error
            prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
            // @ts-expect-error
            prismaMock.booking.create.mockResolvedValue(mockCreatedBooking);
            // @ts-expect-error mockResolvedValue error
            prismaMock.addOn.findFirstOrThrow.mockResolvedValue(internetAddon);
            // @ts-expect-error mockResolvedValue error
            prismaMock.deposit.create.mockResolvedValue({
                id: 1,
                booking_id: 1,
                amount: new Prisma.Decimal(500),
                status: 'UNPAID',
                received_at: new Date(),
                refunded_at: null,
                applied_at: null,
                refunded_amount: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            prismaMock.bill.create
                // @ts-expect-error mockResolvedValue error
                .mockResolvedValueOnce({
                    id: 100, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -1),
                    bill_item: [
                        {
                            id: 5,
                            type: BillType.GENERATED,
                            amount: mockBookingData.fee
                        },
                    ]
                })
                .mockResolvedValueOnce({
                    id: 200, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, -1),
                    bill_item: [
                        {
                            id: 7,
                            type: BillType.GENERATED,
                            amount: mockBookingData.fee
                        },
                    ]
                })
                .mockResolvedValueOnce({
                    id: 300, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 3, -1),
                    bill_item: [
                        {
                            id: 8,
                            type: BillType.GENERATED,
                            amount: mockBookingData.fee
                        },
                    ]
                });
            // @ts-expect-error mockResolvedValue error
            prismaMock.booking.findFirst.mockResolvedValue(mockCreatedBooking);


            // @ts-expect-error mockBookingData type
            const result = await createBooking(mockBookingData, mockDuration);

            expect(result.success).toEqual(mockCreatedBooking);
            expect(prismaMock.booking.create).toHaveBeenCalledWith({
                // data: expect.objectContaining({fee: "1000"}),
                data: expect.any(Object),
                // include: expect.any(Object),
            });
            expect(prismaMock.bill.create)
                .toHaveBeenNthCalledWith(1, expect.objectContaining({
                    data: expect.objectContaining({
                        bill_item: {
                            createMany: {
                                data: expect.arrayContaining([
                                    expect.objectContaining({
                                        description: "Biaya Sewa Kamar (December 1-31)",
                                        amount: new Prisma.Decimal(1000),
                                        type: BillType.GENERATED
                                    })
                                ])
                            }
                        }
                    })
                }));
            expect(prismaMock.bill.create)
                .toHaveBeenNthCalledWith(2, expect.objectContaining({
                    data: expect.objectContaining({
                        bill_item: {
                            createMany: {
                                data: expect.arrayContaining([
                                    expect.objectContaining({
                                        description: "Biaya Sewa Kamar (January 1-31)",
                                        amount: new Prisma.Decimal(1000),
                                        type: BillType.GENERATED
                                    })
                                ])
                            }
                        }
                    })
                }));
            expect(prismaMock.bill.create)
                .toHaveBeenNthCalledWith(3, expect.objectContaining({
                    data: expect.objectContaining({
                        bill_item: {
                            createMany: {
                                data: expect.arrayContaining([
                                    expect.objectContaining({
                                        description: "Biaya Sewa Kamar (February 1-28)",
                                        amount: new Prisma.Decimal(1000),
                                        type: BillType.GENERATED
                                    })
                                ])
                            }
                        }
                    })
                }));
            expect(prismaMock.bookingAddOn.createMany).toHaveBeenCalledTimes(1);
            expect(prismaMock.billItem.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    {
                        bill_id: 100,
                        description: 'Biaya Layanan Tambahan (Internet) (December 1 - February 28)',
                        amount: new Prisma.Decimal(300000),
                        type: BillType.GENERATED
                    },
                ])
            });
            expect(prismaMock.billItem.create).toHaveBeenCalledWith({
                data:
                    {
                        bill_id: 100,
                        description: 'Deposit Kamar',
                        amount: new Prisma.Decimal(500),
                        type: BillType.CREATED,
                        related_id: expect.anything(),
                    },
            });
            expect(prismaMock.booking.findFirst).toHaveBeenCalledWith({
                where: {id: mockCreatedBooking.id},
                include: expect.any(Object),
            });
        });

        it('should handle prorated billing when start_date is not the first of the month', async () => {
            const startDate = new Date(2024, 10, 15);
            const mockBookingData = {
                fee: 1500,
                addOns: [],
                start_date: startDate,
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
            prismaMock.bill.create
                // @ts-expect-error mockReturnValueOnce error
                .mockReturnValueOnce({
                    id: 1, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -1)
                })
                .mockReturnValueOnce({
                    id: 2, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, -1)
                })
                .mockReturnValueOnce({
                    id: 3, due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 3, -1)
                });

            // @ts-expect-error mockBookingData type
            await createBooking(mockBookingData, mockDuration);
            // @ts-expect-error mock
            expect(prismaMock.bill.create.mock.calls[0][0])
                .toEqual(expect.objectContaining({
                    data: expect.objectContaining({
                        bill_item: {
                            createMany: {
                                data: expect.arrayContaining([
                                    expect.objectContaining({
                                        amount: new Prisma.Decimal(800)
                                    })
                                ])
                            }
                        }
                    })
                }));
            // @ts-expect-error mock
            expect(prismaMock.bill.create.mock.calls[1][0])
                .toEqual(expect.objectContaining({
                    data: expect.objectContaining({
                        bill_item: {
                            createMany: {
                                data: expect.arrayContaining([
                                    expect.objectContaining({
                                        amount: new Prisma.Decimal(1500)
                                    })
                                ])
                            }
                        }
                    })
                }));

            // expect(prismaMock.billItem.create).toHaveBeenCalledTimes(mockDuration.month_count + 1); // One for each month in duration + prorata
        });
    });

    describe('updateBookingByID', () => {
        it('should update a booking with new bills, bill items, and add-ons', async () => {
            const mockBookingID = 1;
            const startDate = new Date(2024, 11, 1);

            const internetAddonPricing: AddOnPricing[] = [
                {
                    id: '0', interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true,
                    addon_id: 'addon-id-1',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: '0', interval_start: 3, interval_end: null, price: 120000,
                    addon_id: 'addon-id-1',
                    is_full_payment: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
            ];
            const internetAddon: Partial<AddonIncludePricing> = {
                id: 'addon-id-1',
                name: 'Internet',
                pricing: internetAddonPricing,
            };
            const internetBookingAddon: BookingAddOn = {
                start_date: startDate,
                end_date: new Date(2025, 1, 28),
                booking_id: 1,
                addon_id: 'addon-id-1',
                id: '',
                input: "Internet",
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const internetBookingAddon2: BookingAddOn = {
                start_date: startDate,
                end_date: new Date(2025, 1, 28),
                booking_id: 1,
                addon_id: 'addon-id-2',
                id: 'addon-2',
                input: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockBookingData = {
                fee: new Prisma.Decimal(2000),
                addOns: [internetBookingAddon, internetBookingAddon2],
                start_date: startDate,
                deposit: new Prisma.Decimal(1000)
            };
            // @ts-expect-error duration error type
            const mockDuration: Duration = {id: 2, month_count: 3};
            const mockCreatedBillItem: Partial<BillItem> = {
                id: 10,
                type: BillType.CREATED,
                amount: new Prisma.Decimal(300)
            };
            const mockPayments: Partial<Payment>[] = [
                {
                    id: 1,
                    amount: new Prisma.Decimal(200),
                    payment_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -5)
                },
                {
                    id: 2,
                    amount: new Prisma.Decimal(1800),
                    payment_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -3)
                },
                {
                    id: 3,
                    amount: new Prisma.Decimal(2000),
                    payment_date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, -15)
                }
            ];

            // @ts-expect-error
            prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue({id: mockBookingID});
            // @ts-expect-error
            prismaMock.payment.findMany.mockResolvedValue(mockPayments);
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
                // To be deleted
                {
                    id: 'addon-3',
                    input: 'Extra bed 3',
                    start_date: startDate,
                    addon_id: 'addon-id-1',
                    booking_id: mockBookingID
                },
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
            // @ts-expect-error mockResolvedValue error
            prismaMock.deposit.create.mockResolvedValue({
                id: 1,
                booking_id: mockBookingID,
                amount: new Prisma.Decimal(1000),
                status: 'UNPAID',
                received_at: new Date(),
                refunded_at: null,
                applied_at: null,
                refunded_amount: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            // @ts-expect-error mockResolvedValue
            prismaMock.addOn.findFirstOrThrow.mockResolvedValue(internetAddon);
            const newBills: Partial<Bill & { bill_item: Partial<BillItem>[] }>[] = [
                {
                    id: 100,
                    due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -1),
                    bill_item: [
                        {
                            id: 5,
                            type: BillType.GENERATED,
                            amount: new Prisma.Decimal(mockBookingData.fee)
                        },
                        mockCreatedBillItem
                    ]
                },
                {
                    id: 200,
                    due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, -1),
                    bill_item: [
                        {
                            id: 7,
                            type: BillType.GENERATED,
                            amount: new Prisma.Decimal(mockBookingData.fee)
                        },
                    ]
                },
                {
                    id: 300,
                    due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 3, -1),
                    bill_item: [
                        {
                            id: 8,
                            type: BillType.GENERATED,
                            amount: new Prisma.Decimal(mockBookingData.fee)
                        },
                    ]
                }
            ];
            prismaMock.bill.create
                // @ts-expect-error mockReturnValueOnce error
                .mockResolvedValueOnce(newBills[0])
                .mockResolvedValueOnce(newBills[1])
                .mockResolvedValueOnce(newBills[2]);
            prismaMock.bill.findMany
                // @ts-expect-error mockResolvedValue error
                .mockReturnValueOnce([ // existing bills
                    {
                        paymentBills: [{id: 1}, {id: 2}],
                        bill_item: [mockCreatedBillItem],
                        due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, -1)
                    },
                    {
                        paymentBills: [{id: 3}],
                        bill_item: [],
                        due_date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, -1)
                    }
                ])
                .mockReturnValueOnce(newBills);

            // @ts-expect-error mockData type
            const result = await updateBookingByID(mockBookingID, mockBookingData, mockDuration);

            expect(result.success).toBeTruthy();
            expect(prismaMock.bookingAddOn.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: ['addon-3', 'addon-4', 'addon-5']
                    }
                }
            });
            expect(prismaMock.bookingAddOn.update).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    id: "addon-2"
                }
            }));
            expect(prismaMock.bookingAddOn.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([expect.objectContaining({
                    input: "Internet"
                })])
            });
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
            expect(prismaMock.bill.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
                data: expect.objectContaining({
                    bill_item: expect.objectContaining({
                        createMany: {
                            data: expect.arrayContaining([
                                expect.objectContaining({
                                    description: expect.stringContaining("Biaya Sewa Kamar"),
                                    amount: mockBookingData.fee,
                                    type: BillType.GENERATED
                                })
                            ])
                        }
                    })
                })
            }));
            expect(prismaMock.bill.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
                data: expect.objectContaining({
                    bill_item: expect.objectContaining({
                        createMany: {
                            data: expect.arrayContaining([
                                expect.objectContaining({
                                    description: expect.stringContaining("Biaya Sewa Kamar"),
                                    amount: mockBookingData.fee,
                                    type: BillType.GENERATED
                                })
                            ])
                        }
                    })
                })
            }));
            expect(prismaMock.bill.create).toHaveBeenNthCalledWith(3, expect.objectContaining({
                data: expect.objectContaining({
                    bill_item: expect.objectContaining({
                        createMany: {
                            data: expect.arrayContaining([
                                expect.objectContaining({
                                    description: expect.stringContaining("Biaya Sewa Kamar"),
                                    amount: mockBookingData.fee,
                                    type: BillType.GENERATED
                                })
                            ])
                        }
                    })
                })
            }));
            expect(prismaMock.booking.update).toHaveBeenCalledTimes(1);
            expect(prismaMock.billItem.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    bill_id: 100,
                    description: 'Deposit Kamar',
                    amount: mockBookingData.deposit,
                    type: BillType.CREATED,
                    related_id: expect.anything(),
                })
            }));
            expect(prismaMock.billItem.createMany).toHaveBeenNthCalledWith(1, {
                data: expect.arrayContaining([
                    expect.objectContaining({
                        description: expect.stringContaining("Biaya Layanan Tambahan"),
                        type: BillType.GENERATED
                    })
                ])
            });
            expect(prismaMock.billItem.createMany).toHaveBeenNthCalledWith(2, {
                data: expect.arrayContaining([
                    expect.objectContaining({
                        ...mockCreatedBillItem,
                        bill_id: 100,
                    })
                ])
            });
            expect(prismaMock.paymentBill.createManyAndReturn).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        amount: new Prisma.Decimal(200),
                        bill_id: 100,
                    }),
                    expect.objectContaining({
                        amount: new Prisma.Decimal(1800),
                        bill_id: 100,
                    }),
                    expect.objectContaining({
                        amount: new Prisma.Decimal(300),
                        bill_id: 100,
                    }),
                    expect.objectContaining({
                        amount: new Prisma.Decimal(1700),
                        bill_id: 200,
                    })
                ])
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
                orderBy: {
                    "createdAt": "desc",
                }
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
