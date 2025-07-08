import {prismaMock} from './singleton_prisma';
import {beforeEach, describe, expect, it} from '@jest/globals';
import {BillType, DepositStatus, Prisma} from '@prisma/client';
import {upsertPaymentAction} from '@/app/(internal)/(dashboard_layout)/payments/payment-action';

// Mock the bill action module
jest.mock('@/app/(internal)/(dashboard_layout)/bills/bill-action', () => ({
    getUnpaidBillsDueAction: jest.fn(),
    simulateUnpaidBillPaymentAction: jest.fn(),
}));

describe('Payment Auto-Allocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    });

    it('should auto-allocate payment to unpaid bills and update deposit status', async () => {
        // Arrange
        const requestData = {
            booking_id: 1,
            amount: new Prisma.Decimal(1500000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            allocationMode: 'auto' as const,
        };

        const bookingData = {
            id: 1,
            room_id: 1,
            start_date: new Date(2024, 0, 1),
            duration_id: 1,
            status_id: 1,
            fee: new Prisma.Decimal(1000000),
            tenant_id: 'tenant-1',
            end_date: new Date(2024, 2, 31),
            second_resident_fee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const extendedBookingData = {
            ...bookingData,
            rooms: {
                id: 1,
                location_id: 1,
                room_number: '101',
                room_type_id: 1,
                status_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            tenants: {
                id: 'tenant-1',
                name: 'Test Tenant',
                phone: '123456789',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            custom_id: '#-1'
        };

        const paymentData = {
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(1500000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: extendedBookingData,
            paymentstatuses: {
                id: 1,
                status: 'Paid',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        };

        // Mock booking data
        prismaMock.booking.findFirst.mockResolvedValueOnce(bookingData);

        // Mock payment creation
        prismaMock.payment.create.mockResolvedValueOnce(paymentData);

        // Mock auto-allocation functions
        const { getUnpaidBillsDueAction, simulateUnpaidBillPaymentAction } = require('@/app/(internal)/(dashboard_layout)/bills/bill-action');

        getUnpaidBillsDueAction.mockResolvedValueOnce({
            total: 1500000,
            bills: [
                {
                    id: 10,
                    booking_id: 1,
                    description: 'Test Bill',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {id: 100, bill_id: 10, amount: new Prisma.Decimal(1000000), description: 'Sewa', type: BillType.GENERATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                        {id: 101, bill_id: 10, amount: new Prisma.Decimal(500000), description: 'Deposit Kamar', type: BillType.CREATED, related_id: {deposit_id: 1}, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                    ],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0),
                }
            ]
        });

        simulateUnpaidBillPaymentAction.mockResolvedValueOnce({
            old: {
                balance: 1500000,
                bills: []
            },
            new: {
                balance: 0,
                payments: [
                    {payment_id: 1, bill_id: 10, amount: new Prisma.Decimal(1500000)}
                ]
            }
        });

        prismaMock.payment.findFirst.mockResolvedValueOnce(paymentData);

        prismaMock.paymentBill.findMany.mockResolvedValueOnce([
            {
                id: 1,
                payment_id: 1,
                bill_id: 10,
                amount: new Prisma.Decimal(1500000),
                // @ts-expect-error type mismatch
                bill: {
                    id: 10,
                    booking_id: 1,
                    description: 'Test Bill',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {
                            id: 100,
                            bill_id: 10,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Sewa',
                            type: BillType.GENERATED,
                            related_id: null,
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: 101,
                            bill_id: 10,
                            amount: new Prisma.Decimal(500000),
                            description: 'Deposit Kamar',
                            type: BillType.CREATED,
                            related_id: {deposit_id: 1},
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    ]
                }
            }
        ]);

        // Mock deposit data
        prismaMock.deposit.findUnique.mockResolvedValueOnce({
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(500000),
            status: DepositStatus.UNPAID,
            refunded_at: null,
            applied_at: null,
            refunded_amount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Mock deposit update
        prismaMock.deposit.update.mockResolvedValueOnce({
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(500000),
            status: DepositStatus.HELD,
            refunded_at: null,
            applied_at: null,
            refunded_amount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // // Mock payment bill creation
        // prismaMock.paymentBill.createMany.mockResolvedValue({count: 1});
        // prismaMock.paymentBill.findMany.mockResolvedValue([]);
        prismaMock.transaction.findMany.mockResolvedValue([]);

        // Mock transaction creation
        prismaMock.transaction.create.mockResolvedValueOnce({
            id: 1,
            amount: new Prisma.Decimal(1000000),
            description: 'Payment',
            date: new Date('2024-01-15'),
            category: 'Biaya Sewa',
            location_id: 1,
            type: 'INCOME',
            related_id: {payment_id: 1},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.transaction.create.mockResolvedValueOnce({
            id: 1,
            amount: new Prisma.Decimal(500000),
            description: 'Payment',
            date: new Date('2024-01-15'),
            category: 'Deposit',
            location_id: 1,
            type: 'INCOME',
            related_id: {payment_id: 1, booking_id: 1, deposit_id: 1},
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Act
        const result = await upsertPaymentAction(requestData);

        // Assert
        expect(result.success).toBeDefined();
        expect(prismaMock.booking.findFirst).toHaveBeenCalled();
        expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        expect(prismaMock.paymentBill.findMany).toHaveBeenCalled();
        expect(prismaMock.payment.create).toHaveBeenCalled();
        expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        expect(prismaMock.deposit.findUnique).toHaveBeenCalled();
        expect(prismaMock.deposit.update).toHaveBeenCalled();
        expect(prismaMock.transaction.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.create).toHaveBeenNthCalledWith(1, {
            data: expect.objectContaining({
                amount: new Prisma.Decimal(1000000),
            })
        });
        expect(prismaMock.transaction.create).toHaveBeenNthCalledWith(2, {
            data: expect.objectContaining({
                amount: new Prisma.Decimal(500000),
            })
        });
        expect(prismaMock.deposit.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {id: 1},
                data: {status: DepositStatus.HELD}
            })
        );
    });

        it('should handle auto-allocation with no unpaid bills', async () => {
        // Arrange
        const requestData = {
            booking_id: 1,
            amount: new Prisma.Decimal(1000000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            allocationMode: 'auto' as const,
        };

        const bookingData = {
            id: 1,
            room_id: 1,
            start_date: new Date(2024, 0, 1),
            duration_id: 1,
            status_id: 1,
            fee: new Prisma.Decimal(1000000),
            tenant_id: 'tenant-1',
            end_date: new Date(2024, 2, 31),
            second_resident_fee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const extendedBookingData = {
            ...bookingData,
            rooms: {
                id: 1,
                location_id: 1,
                room_number: '101',
                room_type_id: 1,
                status_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            tenants: {
                id: 'tenant-1',
                name: 'Test Tenant',
                phone: '123456789',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            custom_id: '#-1'
        };

        const paymentData = {
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(1000000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: extendedBookingData,
            paymentstatuses: {
                id: 1,
                status: 'Paid',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        };

        // Mock booking data
        prismaMock.booking.findFirst.mockResolvedValueOnce(bookingData);

        // Mock payment creation
        prismaMock.payment.create.mockResolvedValueOnce(paymentData);

        // Mock auto-allocation functions - no unpaid bills
        const { getUnpaidBillsDueAction, simulateUnpaidBillPaymentAction } = require('@/app/(internal)/(dashboard_layout)/bills/bill-action');

        getUnpaidBillsDueAction.mockResolvedValueOnce({
            total: 0,
            bills: []
        });

        simulateUnpaidBillPaymentAction.mockResolvedValueOnce({
            old: {
                balance: 1000000,
                bills: []
            },
            new: {
                balance: 1000000,
                payments: []
            }
        });

        prismaMock.payment.findFirst.mockResolvedValueOnce(paymentData);
        prismaMock.paymentBill.findMany.mockResolvedValueOnce([]);
        prismaMock.transaction.findMany.mockResolvedValue([]);

        // Mock deposit findFirst for getDepositIdForBooking
        prismaMock.deposit.findFirst.mockResolvedValueOnce(null);

        // Mock transaction creation - no regular amount, so no transaction created
        // The function will not create transactions when there are no payment bills

        // Act
        const result = await upsertPaymentAction(requestData);

        // Assert
        expect(result.success).toBeDefined();
        expect(prismaMock.booking.findFirst).toHaveBeenCalled();
        expect(prismaMock.payment.create).toHaveBeenCalled();
        expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        expect(prismaMock.paymentBill.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.findMany).toHaveBeenCalled();
        // No transaction should be created when there are no payment bills
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

        it('should handle auto-allocation with partial payment amount', async () => {
        // Arrange
        const requestData = {
            booking_id: 1,
            amount: new Prisma.Decimal(500000), // Partial payment
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            allocationMode: 'auto' as const,
        };

        const bookingData = {
            id: 1,
            room_id: 1,
            start_date: new Date(2024, 0, 1),
            duration_id: 1,
            status_id: 1,
            fee: new Prisma.Decimal(1000000),
            tenant_id: 'tenant-1',
            end_date: new Date(2024, 2, 31),
            second_resident_fee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const extendedBookingData = {
            ...bookingData,
            rooms: {
                id: 1,
                location_id: 1,
                room_number: '101',
                room_type_id: 1,
                status_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            tenants: {
                id: 'tenant-1',
                name: 'Test Tenant',
                phone: '123456789',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            custom_id: '#-1'
        };

        const paymentData = {
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(500000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: extendedBookingData,
            paymentstatuses: {
                id: 1,
                status: 'Paid',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        };

        // Mock booking data
        prismaMock.booking.findFirst.mockResolvedValueOnce(bookingData);

        // Mock payment creation
        prismaMock.payment.create.mockResolvedValueOnce(paymentData);

        // Mock auto-allocation functions
        const { getUnpaidBillsDueAction, simulateUnpaidBillPaymentAction } = require('@/app/(internal)/(dashboard_layout)/bills/bill-action');

        getUnpaidBillsDueAction.mockResolvedValueOnce({
            total: 1500000,
            bills: [
                {
                    id: 10,
                    booking_id: 1,
                    description: 'Test Bill',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {id: 100, bill_id: 10, amount: new Prisma.Decimal(1000000), description: 'Sewa', type: BillType.GENERATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                        {id: 101, bill_id: 10, amount: new Prisma.Decimal(500000), description: 'Deposit Kamar', type: BillType.CREATED, related_id: {deposit_id: 1}, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                    ],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0),
                }
            ]
        });

        simulateUnpaidBillPaymentAction.mockResolvedValueOnce({
            old: {
                balance: 500000,
                bills: []
            },
            new: {
                balance: 0,
                payments: [
                    {payment_id: 1, bill_id: 10, amount: new Prisma.Decimal(500000)}
                ]
            }
        });

        // Mock payment.findFirst for all calls (main action and transaction context)
        prismaMock.payment.findFirst.mockResolvedValue(paymentData);

        // Mock paymentBill.findMany for createOrUpdatePaymentTransactions
        prismaMock.paymentBill.findMany.mockResolvedValueOnce([
            {
                id: 1,
                payment_id: 1,
                bill_id: 10,
                amount: new Prisma.Decimal(500000),
                // @ts-expect-error type mismatch
                bill: {
                    id: 10,
                    booking_id: 1,
                    description: 'Test Bill',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {
                            id: 100,
                            bill_id: 10,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Sewa',
                            type: BillType.GENERATED,
                            related_id: null,
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: 101,
                            bill_id: 10,
                            amount: new Prisma.Decimal(500000),
                            description: 'Deposit Kamar',
                            type: BillType.CREATED,
                            related_id: {deposit_id: 1},
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    ]
                }
            }
        ]);

        // Mock transaction.findMany for createOrUpdatePaymentTransactions
        prismaMock.transaction.findMany.mockResolvedValueOnce([]);

        // Mock deposit.findFirst for getDepositIdForBooking
        prismaMock.deposit.findFirst.mockResolvedValueOnce({
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(500000),
            status: DepositStatus.UNPAID,
            refunded_at: null,
            applied_at: null,
            refunded_amount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Mock transaction.create for createOrUpdatePaymentTransactions
        prismaMock.transaction.create.mockResolvedValueOnce({
            id: 1,
            amount: new Prisma.Decimal(333333.33), // Proportional amount for regular item
            description: 'Payment',
            date: new Date('2024-01-15'),
            category: 'Biaya Sewa',
            location_id: 1,
            type: 'INCOME',
            related_id: {payment_id: 1},
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        prismaMock.transaction.create.mockResolvedValueOnce({
                id: 1,
                amount: new Prisma.Decimal(1666666), // Proportional amount for regular item
                description: 'Payment',
                date: new Date('2024-01-15'),
                category: 'Deposit',
                location_id: 1,
                type: 'INCOME',
                related_id: {payment_id: 1, booking_id: bookingData.id, deposit_id: 1},
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        // Act
        const result = await upsertPaymentAction(requestData);

        // Assert
        expect(result.success).toBeDefined();
        expect(prismaMock.booking.findFirst).toHaveBeenCalled();
        expect(prismaMock.payment.create).toHaveBeenCalled();
        expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        expect(prismaMock.paymentBill.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                amount: expect.any(Prisma.Decimal),
            })
        });
    });

    it('should handle auto-allocation with multiple bills per booking', async () => {
        // Arrange
        const requestData = {
            booking_id: 1,
            amount: new Prisma.Decimal(2000000), // Large payment to cover multiple bills
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            allocationMode: 'auto' as const,
        };

        const bookingData = {
            id: 1,
            room_id: 1,
            start_date: new Date(2024, 0, 1),
            duration_id: 1,
            status_id: 1,
            fee: new Prisma.Decimal(1000000),
            tenant_id: 'tenant-1',
            end_date: new Date(2024, 2, 31),
            second_resident_fee: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const extendedBookingData = {
            ...bookingData,
            rooms: {
                id: 1,
                location_id: 1,
                room_number: '101',
                room_type_id: 1,
                status_id: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            tenants: {
                id: 'tenant-1',
                name: 'Test Tenant',
                phone: '123456789',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            custom_id: '#-1'
        };

        const paymentData = {
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(2000000),
            payment_date: new Date('2024-01-15'),
            payment_proof: null,
            status_id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            bookings: extendedBookingData,
            paymentstatuses: {
                id: 1,
                status: 'Paid',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        };

        // Mock booking data
        prismaMock.booking.findFirst.mockResolvedValueOnce(bookingData);

        // Mock payment creation
        prismaMock.payment.create.mockResolvedValueOnce(paymentData);

        // Mock auto-allocation functions - multiple bills
        const { getUnpaidBillsDueAction, simulateUnpaidBillPaymentAction } = require('@/app/(internal)/(dashboard_layout)/bills/bill-action');

        getUnpaidBillsDueAction.mockResolvedValueOnce({
            total: 3000000,
            bills: [
                {
                    id: 10,
                    booking_id: 1,
                    description: 'Januari 2024',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {id: 100, bill_id: 10, amount: new Prisma.Decimal(1000000), description: 'Sewa Januari', type: BillType.GENERATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                        {id: 101, bill_id: 10, amount: new Prisma.Decimal(500000), description: 'Deposit Kamar', type: BillType.CREATED, related_id: {deposit_id: 1}, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                    ],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0),
                },
                {
                    id: 11,
                    booking_id: 1,
                    description: 'Februari 2024',
                    due_date: new Date(2024, 1, 28),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {id: 102, bill_id: 11, amount: new Prisma.Decimal(1000000), description: 'Sewa Februari', type: BillType.GENERATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                    ],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0),
                },
                {
                    id: 12,
                    booking_id: 1,
                    description: 'Maret 2024',
                    due_date: new Date(2024, 2, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {id: 103, bill_id: 12, amount: new Prisma.Decimal(1000000), description: 'Sewa Maret', type: BillType.GENERATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                        {id: 104, bill_id: 12, amount: new Prisma.Decimal(200000), description: 'Biaya Listrik', type: BillType.CREATED, related_id: null, internal_description: null, createdAt: new Date(), updatedAt: new Date()},
                    ],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0),
                }
            ]
        });

        simulateUnpaidBillPaymentAction.mockResolvedValueOnce({
            old: {
                balance: 1000000,
                bills: []
            },
            new: {
                balance: 0,
                payments: [
                    {payment_id: 1, bill_id: 10, amount: new Prisma.Decimal(1500000)}, // Full payment for bill 10
                    {payment_id: 1, bill_id: 11, amount: new Prisma.Decimal(500000)},  // Partial payment for bill 11
                ]
            }
        });

        // Mock payment.findFirst for all calls (main action and transaction context)
        prismaMock.payment.findFirst.mockResolvedValue(paymentData);

        // Mock paymentBill.findMany for createOrUpdatePaymentTransactions
        prismaMock.paymentBill.findMany.mockResolvedValueOnce([
            {
                id: 1,
                payment_id: 1,
                bill_id: 10,
                amount: new Prisma.Decimal(1500000),
                // @ts-expect-error type mismatch
                bill: {
                    id: 10,
                    booking_id: 1,
                    description: 'Januari 2024',
                    due_date: new Date(2024, 0, 31),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {
                            id: 100,
                            bill_id: 10,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Sewa Januari',
                            type: BillType.GENERATED,
                            related_id: null,
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: 101,
                            bill_id: 10,
                            amount: new Prisma.Decimal(500000),
                            description: 'Deposit Kamar',
                            type: BillType.CREATED,
                            related_id: {deposit_id: 1},
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    ]
                }
            },
            {
                id: 2,
                payment_id: 1,
                bill_id: 11,
                amount: new Prisma.Decimal(500000),
                // @ts-expect-error type mismatch
                bill: {
                    id: 11,
                    booking_id: 1,
                    description: 'Februari 2024',
                    due_date: new Date(2024, 1, 28),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    bill_item: [
                        {
                            id: 102,
                            bill_id: 11,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Sewa Februari',
                            type: BillType.GENERATED,
                            related_id: null,
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                    ]
                }
            }
        ]);

        // Mock transaction.findMany for createOrUpdatePaymentTransactions
        prismaMock.transaction.findMany.mockResolvedValueOnce([]);

        // Mock deposit.findFirst for getDepositIdForBooking
        prismaMock.deposit.findFirst.mockResolvedValueOnce({
            id: 1,
            booking_id: 1,
            amount: new Prisma.Decimal(500000),
            status: DepositStatus.UNPAID,
            refunded_at: null,
            applied_at: null,
            refunded_amount: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Mock transaction creation - multiple transactions for different amounts
        prismaMock.transaction.create.mockResolvedValueOnce({
            id: 1,
            amount: new Prisma.Decimal(1000000), // Regular amount from bill 10 (1000000) + bill 11 (500000) = 1500000 * (1000000/1500000) = 1000000
            description: 'Payment',
            date: new Date('2024-01-15'),
            category: 'Biaya Sewa',
            location_id: 1,
            type: 'INCOME',
            related_id: {payment_id: 1},
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        prismaMock.transaction.create.mockResolvedValueOnce({
            id: 2,
            amount: new Prisma.Decimal(500000), // Deposit amount from bill 10
            description: 'Payment',
            date: new Date('2024-01-15'),
            category: 'Deposit',
            location_id: 1,
            type: 'INCOME',
            related_id: {payment_id: 1, booking_id: bookingData.id, deposit_id: 1},
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Act
        const result = await upsertPaymentAction(requestData);

        // Assert
        expect(result.success).toBeDefined();
        expect(prismaMock.booking.findFirst).toHaveBeenCalled();
        expect(prismaMock.payment.create).toHaveBeenCalled();
        expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        expect(prismaMock.paymentBill.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.findMany).toHaveBeenCalled();
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(2);

        // Verify the auto-allocation was called with the correct parameters
        expect(getUnpaidBillsDueAction).toHaveBeenCalledWith(1);
        expect(simulateUnpaidBillPaymentAction).toHaveBeenCalledWith(
            2000000, // The amount should be passed as a number, not Prisma.Decimal
            expect.arrayContaining([
                expect.objectContaining({ id: 10 }),
                expect.objectContaining({ id: 11 }),
                expect.objectContaining({ id: 12 })
            ]),
            1
        );
    });
});
