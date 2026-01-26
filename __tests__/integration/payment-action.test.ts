import {beforeEach} from "@jest/globals";
import {Prisma} from "@prisma/client";
import prisma from '@/app/_lib/primsa';
import {cleanupDatabase, seedBaseFixtures, seedBookingWithBills, utcDate} from "./helpers";
import {upsertBookingAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {deletePaymentAction, upsertPaymentAction} from "@/app/(internal)/(dashboard_layout)/payments/payment-action";

describe('20260126 - payments & income inconsistency', () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('should create a consistent income', async () => {
        const base = await seedBaseFixtures();
        const roomType = await prisma.roomType.create({
            data: {
                type: 'Standard Plus',
                description: 'luas 3x4, jendela luar, fully furnished'
            }
        });
        const room = await prisma.room.create({
            data: {
                room_number: '309',
                room_type_id: roomType.id,
                status_id: base.roomStatusId,
                location_id: base.locationId
            }
        });
        const duration = await prisma.duration.create({
            data: {
                duration: '3 Bulan',
                month_count: 3
            }
        });

        const bookingReq = await upsertBookingAction({
            room_id: room.id,
            start_date: utcDate(2024,5,1),
            duration_id: duration.id,
            status_id: base.bookingStatusId,
            fee: 2250000,
            tenant_id: base.tenantId,
            end_date: utcDate(2024,7,31),
            second_resident_fee: null,
            is_rolling: false,
        } as any);

        expect(bookingReq.success).toBeDefined();
        const bookingData = bookingReq.success!;

        const bills = await prisma.bill.findMany({
            where: {
                booking_id: bookingData.id
            },
            include: {
                bill_item: true,
                paymentBills: true,
            }
        });

        expect(bills.length).toEqual(3);

        // create payment
        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: bookingData.id,
            amount: new Prisma.Decimal(6750000),
            payment_date: utcDate(2024, 5, 1),
            status_id: paymentStatus.id,
            allocationMode: 'auto',
            payment_proof: null
        });

        expect(payment.success).toBeDefined();

        const paymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            }
        });

        expect(paymentBills.length).toEqual(3);
        paymentBills.forEach(pb => {
            expect(pb.amount.toNumber()).toEqual(2250000);
        });

        const income = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        expect(income).toBeDefined();
        expect(income!.amount.toNumber()).toEqual(6750000);
    });

    it('case 2 - payments modified', async () => {
        const base = await seedBaseFixtures();
        const roomType = await prisma.roomType.create({
            data: {
                type: 'Standard Plus',
                description: 'luas 3x4, jendela luar, fully furnished'
            }
        });
        const room = await prisma.room.create({
            data: {
                room_number: '309',
                room_type_id: roomType.id,
                status_id: base.roomStatusId,
                location_id: base.locationId
            }
        });
        const duration = await prisma.duration.create({
            data: {
                duration: '3 Bulan',
                month_count: 3
            }
        });

        const bookingReq = await upsertBookingAction({
            room_id: room.id,
            start_date: utcDate(2024,5,1),
            duration_id: duration.id,
            status_id: base.bookingStatusId,
            fee: 2250000,
            tenant_id: base.tenantId,
            end_date: utcDate(2024,7,31),
            second_resident_fee: null,
            is_rolling: false,
        } as any);

        expect(bookingReq.success).toBeDefined();
        const bookingData = bookingReq.success!;

        const bills = await prisma.bill.findMany({
            where: {
                booking_id: bookingData.id
            },
            include: {
                bill_item: true,
                paymentBills: true,
            }
        });

        expect(bills.length).toEqual(3);

        // create payment
        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: bookingData.id,
            amount: new Prisma.Decimal(5600000),
            payment_date: utcDate(2024, 5, 1),
            status_id: paymentStatus.id,
            allocationMode: 'auto',
            payment_proof: null
        });

        expect(payment.success).toBeDefined();

        const paymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            }
        });

        expect(paymentBills.length).toEqual(3);
        expect(paymentBills[0].amount.toNumber()).toEqual(2250000);
        expect(paymentBills[1].amount.toNumber()).toEqual(2250000);
        expect(paymentBills[2].amount.toNumber()).toEqual(1100000);

        const income = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        expect(income).toBeDefined();
        expect(income!.amount.toNumber()).toEqual(5600000);


        // modify payment
        const updatedPayment = await upsertPaymentAction({
            id: payment.success!.id,
            booking_id: bookingData.id,
            amount: new Prisma.Decimal(6750000),
            payment_date: utcDate(2024, 5, 2),
            status_id: paymentStatus.id,
            allocationMode: 'auto',
            payment_proof: null
        });

        expect(updatedPayment.success).toBeDefined();

        const updatedPaymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            }
        });

        // Found Issue #1 - paymentBills not updated
        // issue was the removing duplicates in syncBillsWithPaymentDate does not consider payment_date
        expect(updatedPaymentBills.length).toEqual(3);
        updatedPaymentBills.forEach(pb => {
            expect(pb.amount.toNumber()).toEqual(2250000);
        });

        const updatedIncome = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        // Found Issue #2 - income not updated (might be due to #1)
        expect(updatedIncome).toBeDefined();
        expect(updatedIncome!.amount.toNumber()).toEqual(6750000);
    });

    it('case 3 - perubahan alokasi manual tetap konsisten', async () => {
        const {bills, booking} = await seedBookingWithBills();

        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: booking.id,
            amount: new Prisma.Decimal(4500000),
            payment_date: utcDate(2024, 5, 1),
            status_id: paymentStatus.id,
            allocationMode: 'manual',
            manualAllocations: {
                [bills[0].id]: 1000000,
                [bills[1].id]: 2000000,
                [bills[2].id]: 1500000
            },
            payment_proof: null
        });

        expect(payment.success).toBeDefined();

        const paymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            },
            orderBy: {
                bill_id: 'asc'
            }
        });

        expect(paymentBills.length).toEqual(3);
        expect(paymentBills[0].amount.toNumber()).toEqual(1000000);
        expect(paymentBills[1].amount.toNumber()).toEqual(2000000);
        expect(paymentBills[2].amount.toNumber()).toEqual(1500000);

        const updatedPayment = await upsertPaymentAction({
            id: payment.success!.id,
            booking_id: booking.id,
            amount: new Prisma.Decimal(6750000),
            payment_date: utcDate(2024, 5, 2),
            status_id: paymentStatus.id,
            allocationMode: 'manual',
            manualAllocations: {
                [bills[0].id]: 2250000,
                [bills[1].id]: 2250000,
                [bills[2].id]: 2250000
            },
            payment_proof: null
        });

        expect(updatedPayment.success).toBeDefined();

        const updatedPaymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            },
            orderBy: {
                bill_id: 'asc'
            }
        });

        expect(updatedPaymentBills.length).toEqual(3);
        updatedPaymentBills.forEach(pb => {
            expect(pb.amount.toNumber()).toEqual(2250000);
        });

        const updatedIncome = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        expect(updatedIncome).toBeDefined();
        expect(updatedIncome!.amount.toNumber()).toEqual(6750000);
    });

    it('case 4 - ganti alokasi auto ke manual', async () => {
        const {bills, booking} = await seedBookingWithBills();

        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: booking.id,
            amount: new Prisma.Decimal(5600000),
            payment_date: utcDate(2024, 5, 1),
            status_id: paymentStatus.id,
            allocationMode: 'auto',
            payment_proof: null
        });

        expect(payment.success).toBeDefined();

        const updatedPayment = await upsertPaymentAction({
            id: payment.success!.id,
            booking_id: booking.id,
            amount: new Prisma.Decimal(6000000),
            payment_date: utcDate(2024, 5, 2),
            status_id: paymentStatus.id,
            allocationMode: 'manual',
            manualAllocations: {
                [bills[0].id]: 2000000,
                [bills[1].id]: 2000000,
                [bills[2].id]: 2000000
            },
            payment_proof: null
        });

        expect(updatedPayment.success).toBeDefined();

        const updatedPaymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            },
            orderBy: {
                bill_id: 'asc'
            }
        });

        expect(updatedPaymentBills.length).toEqual(3);
        updatedPaymentBills.forEach(pb => {
            expect(pb.amount.toNumber()).toEqual(2000000);
        });

        const updatedIncome = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        expect(updatedIncome).toBeDefined();
        expect(updatedIncome!.amount.toNumber()).toEqual(6000000);
    });

    it('case 5 - ganti alokasi manual ke auto', async () => {
        const {bills, booking} = await seedBookingWithBills();

        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: booking.id,
            amount: new Prisma.Decimal(3000000),
            payment_date: utcDate(2024, 5, 1),
            status_id: paymentStatus.id,
            allocationMode: 'manual',
            manualAllocations: {
                [bills[0].id]: 1500000,
                [bills[1].id]: 1000000,
                [bills[2].id]: 500000
            },
            payment_proof: null
        });

        expect(payment.success).toBeDefined();

        const updatedPayment = await upsertPaymentAction({
            id: payment.success!.id,
            booking_id: booking.id,
            amount: new Prisma.Decimal(6750000),
            payment_date: utcDate(2024, 5, 2),
            status_id: paymentStatus.id,
            allocationMode: 'auto',
            payment_proof: null
        });

        expect(updatedPayment.success).toBeDefined();

        const updatedPaymentBills = await prisma.paymentBill.findMany({
            where: {
                payment_id: payment.success!.id
            },
            orderBy: {
                bill_id: 'asc'
            }
        });

        expect(updatedPaymentBills.length).toEqual(3);
        updatedPaymentBills.forEach(pb => {
            expect(pb.amount.toNumber()).toEqual(2250000);
        });

        const updatedIncome = await prisma.transaction.findFirst({
            where: {
                related_id: {
                    path: ['payment_id'],
                    equals: payment.success!.id
                }
            }
        });

        expect(updatedIncome).toBeDefined();
        expect(updatedIncome!.amount.toNumber()).toEqual(6750000);
    });
});


describe('deletePaymentAction', () => {
    it('should delete payment action and associated transaction', async () => {
        const base = await seedBookingWithBills(true);

        const paymentStatus = await prisma.paymentStatus.create({
            data: {
                status: "paid",
            }
        });

        const payment = await upsertPaymentAction({
            booking_id: base.booking.id,
            // @ts-expect-error invalid type Decimal vs Number
            amount: Number(base.booking.fee) + 100000, // add deposit amount
            status_id: paymentStatus.id,
            allocationMode: "auto",
            payment_date: utcDate(2025, 1, 1),
            payment_proof: null,
        });

        expect(payment.success).toBeDefined();

        const deposit = await prisma.deposit.findFirst({
            where: {booking_id: base.booking.id}
        });

        expect(deposit).toBeDefined();

        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    {
                        related_id: {
                            path: ['payment_id'],
                            equals: payment.success!.id
                        }
                    },
                    {
                        related_id: {
                            path: ['deposit_id'],
                            equals: deposit!.id
                        }
                    },
                ]
            }
        });

        expect(transactions).toBeDefined();
        expect(transactions).toHaveLength(2);

        const del = await deletePaymentAction(payment.success!.id);

        expect(del.success).toBeDefined();

        const transactionsAfter = await prisma.transaction.findMany({
            where: {
                OR: [
                    {
                        related_id: {
                            path: ['payment_id'],
                            equals: payment.success!.id
                        }
                    },
                    {
                        related_id: {
                            path: ['deposit_id'],
                            equals: deposit!.id
                        }
                    },
                ]
            }
        });

        expect(transactionsAfter).toHaveLength(0);
    });
});

