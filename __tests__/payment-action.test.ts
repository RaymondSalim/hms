import {Prisma} from "@prisma/client";
import {prismaMock} from './singleton_prisma';
import {
    createOrUpdatePaymentTransactions,
    createPaymentBillsFromBillAllocations
} from "@/app/(internal)/(dashboard_layout)/payments/payment-action";

describe('Payment Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createPaymentBillsFromBillAllocations', () => {
        it('should create payment bills from bill allocations', async () => {
            const manualAllocations = { 1: 150, 2: 50 };
            const paymentId = 7;
            const paymentAmount = 200;

            await createPaymentBillsFromBillAllocations(manualAllocations, paymentId, paymentAmount, prismaMock as any);

            expect(prismaMock.paymentBill.createMany).toHaveBeenCalledWith({
                data: [
                    { payment_id: paymentId, bill_id: 1, amount: new Prisma.Decimal(150) },
                    { payment_id: paymentId, bill_id: 2, amount: new Prisma.Decimal(50) },
                ],
            });
        });

        it('should throw if total allocation does not equal payment amount', async () => {
            const manualAllocations = { 1: 100 };
            const paymentId = 8;
            const paymentAmount = 50; // mismatch

            await expect(
                createPaymentBillsFromBillAllocations(manualAllocations, paymentId, paymentAmount, prismaMock as any)
            ).rejects.toThrow('Total manual allocation must equal payment amount');

            expect(prismaMock.paymentBill.createMany).not.toHaveBeenCalled();
        });
    });

    describe('createOrUpdatePaymentTransactions', () => {
        it('splits payment into deposit and regular using deposit-first ordering and updates/creates transactions', async () => {
            // Arrange
            const paymentId = 11;
            const bookingId = 22;
            const locationId = 3;

            // Mock payment with booking/room location
            (prismaMock.payment.findFirst as jest.Mock).mockResolvedValue({
                id: paymentId,
                booking_id: bookingId,
                payment_date: new Date('2025-01-02'),
                bookings: { rooms: { location_id: locationId } }
            });

            // Mock paymentBill with a bill that has deposit and regular items
            (prismaMock.paymentBill.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 1001,
                    payment_id: paymentId,
                    bill_id: 501,
                    amount: new Prisma.Decimal(300),
                    bill: {
                        id: 501,
                        bill_item: [
                            { id: 9001, amount: new Prisma.Decimal(200), description: 'Deposit', related_id: { deposit_id: 77 } },
                            { id: 9002, amount: new Prisma.Decimal(200), description: 'Sewa', related_id: null },
                        ]
                    }
                }
            ]);

            // No existing transactions
            (prismaMock.transaction.findMany as jest.Mock).mockResolvedValue([]);

            // Mock deposit lookup
            (prismaMock.deposit.findFirst as jest.Mock).mockResolvedValue({ id: 77, status: 'UNPAID' });
            (prismaMock.deposit.findUnique as jest.Mock).mockResolvedValue({ id: 77, status: 'UNPAID' });
            (prismaMock.deposit.update as jest.Mock).mockResolvedValue({ id: 77, status: 'HELD' });

            // Capture created transactions
            (prismaMock.transaction.create as jest.Mock).mockImplementation(({ data }: any) => Promise.resolve({ id: Math.floor(Math.random()*1000), ...data }));

            // Act
            await createOrUpdatePaymentTransactions(paymentId, prismaMock as any);

            // Assert: deposit-first split -> 300 applies 200 to deposit, 100 to regular
            // One regular transaction created
            expect(prismaMock.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    location_id: locationId,
                    category: 'Biaya Sewa',
                    amount: new Prisma.Decimal(100),
                    type: 'INCOME',
                })
            });
            // One deposit transaction created with related deposit_id
            expect(prismaMock.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    location_id: locationId,
                    category: 'Deposit',
                    amount: new Prisma.Decimal(200),
                    type: 'INCOME',
                    related_id: expect.objectContaining({ deposit_id: 77 })
                })
            });

            // Deposit status updated to HELD
            expect(prismaMock.deposit.update).toHaveBeenCalledWith({
                where: { id: 77 },
                data: { status: 'HELD' }
            });

            // DeleteMany cleanup called with filter by payment_id
            expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
                where: expect.objectContaining({
                    related_id: expect.objectContaining({ path: ['payment_id'], equals: paymentId })
                })
            });
        });

        it('updates existing transactions instead of creating new ones', async () => {
            const paymentId = 12;
            const bookingId = 33;
            const locationId = 4;

            (prismaMock.payment.findFirst as jest.Mock).mockResolvedValue({
                id: paymentId,
                booking_id: bookingId,
                payment_date: new Date('2025-02-01'),
                bookings: { rooms: { location_id: locationId } }
            });

            (prismaMock.paymentBill.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 1002,
                    payment_id: paymentId,
                    bill_id: 601,
                    amount: new Prisma.Decimal(500),
                    bill: {
                        id: 601,
                        bill_item: [
                            { id: 9101, amount: new Prisma.Decimal(100), description: 'Deposit', related_id: { deposit_id: 88 } },
                            { id: 9102, amount: new Prisma.Decimal(500), description: 'Sewa', related_id: null },
                        ]
                    }
                }
            ]);

            (prismaMock.transaction.findMany as jest.Mock).mockResolvedValue([
                { id: 2001, category: 'Biaya Sewa', related_id: { payment_id: paymentId }, amount: new Prisma.Decimal(0) },
                { id: 2002, category: 'Deposit', related_id: { payment_id: paymentId, deposit_id: 88 }, amount: new Prisma.Decimal(0) },
            ]);

            (prismaMock.deposit.findUnique as jest.Mock).mockResolvedValue({ id: 88, status: 'UNPAID' });
            (prismaMock.deposit.update as jest.Mock).mockResolvedValue({ id: 88, status: 'HELD' });

            await createOrUpdatePaymentTransactions(paymentId, prismaMock as any);

            // Deposit-first split for amount 500: 100 deposit, 400 regular
            expect(prismaMock.transaction.update).toHaveBeenCalledWith({
                where: { id: 2001 },
                data: expect.objectContaining({ amount: new Prisma.Decimal(400) })
            });
            expect(prismaMock.transaction.update).toHaveBeenCalledWith({
                where: { id: 2002 },
                data: expect.objectContaining({ amount: new Prisma.Decimal(100) })
            });

            expect(prismaMock.deposit.update).toHaveBeenCalledWith({ where: { id: 88 }, data: { status: 'HELD' } });
        });
    });
});
