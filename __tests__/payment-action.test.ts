import {prismaMock} from './singleton_prisma';
import {Booking, Payment, PaymentBill, PaymentStatus, Prisma} from '@prisma/client';
import {beforeEach, describe, expect, it} from '@jest/globals';
import {
    deletePaymentAction,
    getPaymentStatusAction,
    upsertPaymentAction
} from '@/app/(internal)/(dashboard_layout)/payments/payment-action';

describe('Payment Actions', () => {
    beforeEach(() => {
        // @ts-expect-error
        prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    });

    const mockBooking: Partial<Booking> = {
        id: 1,
        tenant_id: 'tenant-1',
        room_id: 1,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        fee: new Prisma.Decimal(1000000),
        deposit: new Prisma.Decimal(500000),
        status_id: 1,
        duration_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        second_resident_fee: null
    };

    const mockPaymentStatus: PaymentStatus = {
        id: 1,
        status: 'Confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockPayment: Partial<Payment> & { bookings: any } = {
        id: 1,
        booking_id: 1,
        amount: new Prisma.Decimal(500000),
        payment_date: new Date('2024-01-15'),
        payment_proof: null,
        status_id: 1,
        migrated_to_deferred_revenue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bookings: {
            id: 1,
            rooms: {
                id: 1,
                location_id: 1
            }
        }
    };

    const mockPaymentBill: PaymentBill = {
        id: 1,
        payment_id: 1,
        bill_id: 1,
        amount: new Prisma.Decimal(500000)
    };

    describe('upsertPaymentAction - Create Payment', () => {
        it('should create a payment with auto allocation', async () => {
            const paymentData = {
                booking_id: 1,
                amount: new Prisma.Decimal(1500000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'auto' as const
            };

            const mockUnpaidBills = {
                total: 3,
                bills: [
                    {
                        id: 1,
                        booking_id: 1,
                        description: 'Test Bill 1',
                        due_date: new Date('2024-01-31'),
                        bill_item: [{
                            id: 1,
                            bill_id: 1,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Rent',
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: 'GENERATED' as any,
                            related_id: null
                        }],
                        paymentBills: [],
                        sumPaidAmount: new Prisma.Decimal(0)
                    },
                    {
                        id: 2,
                        booking_id: 1,
                        description: 'Test Bill 2',
                        due_date: new Date('2024-02-31'),
                        bill_item: [{
                            id: 1,
                            bill_id: 1,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Rent',
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: 'GENERATED' as any,
                            related_id: null
                        }],
                        paymentBills: [],
                        sumPaidAmount: new Prisma.Decimal(0)
                    },
                    {
                        id: 3,
                        booking_id: 1,
                        description: 'Test Bill 3',
                        due_date: new Date('2024-03-31'),
                        bill_item: [{
                            id: 1,
                            bill_id: 1,
                            amount: new Prisma.Decimal(1000000),
                            description: 'Rent',
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: 'GENERATED' as any,
                            related_id: null
                        }],
                        paymentBills: [],
                        sumPaidAmount: new Prisma.Decimal(0)
                    }
                ]
            };
            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue(mockUnpaidBills.bills);

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.payment.create.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.create.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.createMany.mockResolvedValue({count: 2});

            const result = await upsertPaymentAction(paymentData);

            expect(result.success).toBeDefined();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalledWith({
                data: [
                    {
                        payment_id: 1,
                        bill_id: 1,
                        amount: new Prisma.Decimal(1000000)
                    },
                    {
                        payment_id: 1,
                        bill_id: 2,
                        amount: new Prisma.Decimal(500000)
                    }
                ]
            });
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.bill.findMany).toHaveBeenCalled();
            expect(prismaMock.payment.create).toHaveBeenCalled();
            expect(prismaMock.transaction.create).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalled();
        });

        it('should create a payment with manual allocation', async () => {
            const paymentData = {
                booking_id: 1,
                amount: new Prisma.Decimal(1500000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'manual' as const,
                manualAllocations: {1: 1000000, 2: 250000, 3: 250000}
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.payment.create.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.create.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.createMany.mockResolvedValue({count: 3});

            const result = await upsertPaymentAction(paymentData);

            expect(result.success).toBeDefined();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalledWith({
                data: [
                    {payment_id: 1, bill_id: 1, amount: new Prisma.Decimal(1000000)},
                    {payment_id: 1, bill_id: 2, amount: new Prisma.Decimal(250000)},
                    {payment_id: 1, bill_id: 3, amount: new Prisma.Decimal(250000)}
                ]
            });
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.payment.create).toHaveBeenCalled();
            expect(prismaMock.transaction.create).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalled();
        });

        it('should return error for invalid manual allocation total', async () => {
            const paymentData = {
                booking_id: 1,
                amount: new Prisma.Decimal(500000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'manual' as const,
                manualAllocations: {1: 300000, 2: 100000} // Total: 400000, should be 500000
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.payment.create.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.create.mockResolvedValue({});

            const result = await upsertPaymentAction(paymentData);

            expect(result.failure).toBeDefined();
            expect(result.failure).toContain('Total manual allocation must equal payment amount');
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.payment.create).toHaveBeenCalled();
            expect(prismaMock.transaction.create).toHaveBeenCalled();
        });

        it('should return error for booking not found', async () => {
            const paymentData = {
                booking_id: 999,
                amount: new Prisma.Decimal(500000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(null);

            const result = await upsertPaymentAction(paymentData);

            expect(result.failure).toBe('Booking not found');
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
        });
    });

    describe('upsertPaymentAction - Update Payment', () => {
        it('should update a payment with auto allocation', async () => {
            const paymentData = {
                id: 1,
                booking_id: 1,
                amount: new Prisma.Decimal(600000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'auto' as const
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.payment.update.mockResolvedValue({...mockPayment, id: 1});
            // @ts-expect-error
            prismaMock.transaction.findFirst.mockResolvedValue({id: 1});
            // @ts-expect-error
            prismaMock.transaction.update.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.deleteMany.mockResolvedValue({count: 0});
            // @ts-expect-error
            prismaMock.paymentBill.createManyAndReturn.mockResolvedValue({count: 0});
            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue([{
                id: 1,
                booking_id: 1,
                due_date: new Date('2024-01-31'),
                createdAt: new Date(),
                updatedAt: new Date(),
                paymentBills: [{
                    id: 1,
                    payment_id: 1,
                    bill_id: 1,
                    amount: new Prisma.Decimal(500000),
                }],
                bill_item: [{
                    id: 1,
                    bill_id: 1,
                    amount: new Prisma.Decimal(1000000),
                    description: 'Rent',
                    internal_description: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    type: 'GENERATED' as any,
                    related_id: null
                }]
            }]);

            const result = await upsertPaymentAction(paymentData);

            expect(result.success).toBeDefined();
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.payment.update).toHaveBeenCalled();
            expect(prismaMock.transaction.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.update).toHaveBeenCalled();
            expect(prismaMock.paymentBill.deleteMany).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createManyAndReturn).toHaveBeenCalled();
            expect(prismaMock.bill.findMany).toHaveBeenCalled();
        });

        it('should update a payment with manual allocation', async () => {
            const paymentData = {
                id: 1,
                booking_id: 1,
                amount: new Prisma.Decimal(600000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'manual' as const,
                manualAllocations: {1: 400000, 2: 200000}
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.payment.update.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.findFirst.mockResolvedValue({id: 1});
            // @ts-expect-error
            prismaMock.transaction.update.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.deleteMany.mockResolvedValue({count: 2});
            // @ts-expect-error
            prismaMock.paymentBill.createMany.mockResolvedValue({count: 2});

            const result = await upsertPaymentAction(paymentData);

            expect(result.success).toBeDefined();
            expect(prismaMock.paymentBill.deleteMany).toHaveBeenCalledWith({
                where: {payment_id: 1}
            });
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalledWith({
                data: [
                    {payment_id: 1, bill_id: 1, amount: new Prisma.Decimal(400000)},
                    {payment_id: 1, bill_id: 2, amount: new Prisma.Decimal(200000)}
                ]
            });
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.payment.update).toHaveBeenCalled();
            expect(prismaMock.transaction.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.update).toHaveBeenCalled();
            expect(prismaMock.paymentBill.deleteMany).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalled();
        });
    });

    describe('deletePaymentAction', () => {
        it('should delete a payment successfully', async () => {
            const paymentId = 1;

            // @ts-expect-error
            prismaMock.payment.findFirst.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.payment.delete.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.findFirst.mockResolvedValue({id: 1});
            // @ts-expect-error
            prismaMock.transaction.delete.mockResolvedValue({});

            const result = await deletePaymentAction(paymentId);

            expect(result.success).toBeDefined();
            expect(prismaMock.payment.delete).toHaveBeenCalledWith({
                where: {id: paymentId}
            });
            expect(prismaMock.transaction.delete).toHaveBeenCalledWith({
                where: {id: 1}
            });
            expect(prismaMock.payment.findFirst).toHaveBeenCalled();
            expect(prismaMock.payment.delete).toHaveBeenCalled();
            expect(prismaMock.transaction.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.delete).toHaveBeenCalled();
        });

        it('should return error for payment not found', async () => {
            const paymentId = 999;

            // @ts-expect-error
            prismaMock.payment.findFirst.mockResolvedValue(null);

            const result = await deletePaymentAction(paymentId);

            expect(result.failure).toBe('payment not found');
            expect(prismaMock.payment.findFirst).toHaveBeenCalled();
        });

        it('should return error for invalid payment ID', async () => {
            const paymentId = -1;

            const result = await deletePaymentAction(paymentId);

            expect(result.errors).toBeDefined();
        });
    });

    describe('getPaymentStatusAction', () => {
        it('should return payment statuses', async () => {
            const mockStatuses = [
                {id: 1, status: 'Confirmed', createdAt: new Date(), updatedAt: new Date()},
                {id: 2, status: 'Pending', createdAt: new Date(), updatedAt: new Date()}
            ];

            // @ts-expect-error
            prismaMock.paymentStatus.findMany.mockResolvedValue(mockStatuses);

            const result = await getPaymentStatusAction();

            expect(result).toEqual(mockStatuses);
            expect(prismaMock.paymentStatus.findMany).toHaveBeenCalledWith({
                orderBy: {status: 'asc'}
            });
            expect(prismaMock.paymentStatus.findMany).toHaveBeenCalled();
        });
    });

    describe('Payment CRUD - Combined Test', () => {
        it('should perform complete CRUD operations on a payment', async () => {
            // Step 1: Create payment with auto allocation
            const createData = {
                booking_id: 1,
                amount: new Prisma.Decimal(500000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'auto' as const
            };

            const mockUnpaidBills = {
                total: 1,
                bills: [{
                    id: 1,
                    booking_id: 1,
                    description: 'Test Bill',
                    due_date: new Date('2024-01-31'),
                    bill_item: [{
                        id: 1,
                        bill_id: 1,
                        amount: new Prisma.Decimal(1000000),
                        description: 'Rent',
                        internal_description: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        type: 'GENERATED' as any,
                        related_id: null
                    }],
                    paymentBills: [],
                    sumPaidAmount: new Prisma.Decimal(0)
                }]
            };

            const mockSimulation = {
                old: {balance: 500000, bills: mockUnpaidBills.bills},
                new: {
                    balance: 0,
                    payments: [{
                        payment_id: 1,
                        bill_id: 1,
                        amount: new Prisma.Decimal(500000)
                    }]
                }
            };

            // @ts-expect-error
            prismaMock.booking.findFirst.mockResolvedValue(mockBooking);
            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue(mockUnpaidBills.bills);
            // @ts-expect-error
            prismaMock.payment.create.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.create.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.createMany.mockResolvedValue({count: 1});

            const createResult = await upsertPaymentAction(createData);
            expect(createResult.success).toBeDefined();
            expect(prismaMock.payment.create).toHaveBeenCalled();
            expect(prismaMock.booking.findFirst).toHaveBeenCalled();
            expect(prismaMock.bill.findMany).toHaveBeenCalled();
            expect(prismaMock.transaction.create).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalled();

            // Step 2: Update payment with manual allocation
            const updateData = {
                id: 1,
                booking_id: 1,
                amount: new Prisma.Decimal(600000),
                payment_date: new Date('2024-01-15'),
                payment_proof: null,
                status_id: 1,
                migrated_to_deferred_revenue: false,
                allocationMode: 'manual' as const,
                manualAllocations: {1: 400000, 2: 200000}
            };

            // @ts-expect-error
            prismaMock.payment.update.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.findFirst.mockResolvedValue({id: 1});
            // @ts-expect-error
            prismaMock.transaction.update.mockResolvedValue({});
            // @ts-expect-error
            prismaMock.paymentBill.deleteMany.mockResolvedValue({count: 2});
            // @ts-expect-error
            prismaMock.paymentBill.createMany.mockResolvedValue({count: 2});

            const updateResult = await upsertPaymentAction(updateData);
            expect(updateResult.success).toBeDefined();
            expect(prismaMock.payment.update).toHaveBeenCalled();
            expect(prismaMock.transaction.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.update).toHaveBeenCalled();
            expect(prismaMock.paymentBill.deleteMany).toHaveBeenCalled();
            expect(prismaMock.paymentBill.createMany).toHaveBeenCalled();

            // Step 3: Delete payment
            // @ts-expect-error
            prismaMock.payment.findFirst.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.payment.delete.mockResolvedValue(mockPayment);
            // @ts-expect-error
            prismaMock.transaction.findFirst.mockResolvedValue({id: 1});
            // @ts-expect-error
            prismaMock.transaction.delete.mockResolvedValue({});

            const deleteResult = await deletePaymentAction(1);
            expect(deleteResult.success).toBeDefined();
            expect(prismaMock.payment.delete).toHaveBeenCalled();
            expect(prismaMock.payment.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.findFirst).toHaveBeenCalled();
            expect(prismaMock.transaction.delete).toHaveBeenCalled();
        });
    });
});
