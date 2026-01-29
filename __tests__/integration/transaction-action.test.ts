import {beforeEach} from "@jest/globals";
import {cleanupDatabase, seedBookingWithBills} from "./helpers";
import prisma from "@/app/_lib/primsa";
import {DepositStatus, Prisma} from "@prisma/client";
import {deleteTransactionAction} from "@/app/(internal)/(dashboard_layout)/financials/transaction-action";

describe('deleteTransactionAction', () => {
    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    it('deletes the transaction and associated payment, and resets deposit', async () => {
        const base = await seedBookingWithBills(true);
        const date = new Date();
        const payment = await prisma.payment.create({
            data: {
                booking_id: base.booking.id,
                amount: new Prisma.Decimal(500),
                payment_date: date
            }
        });

        expect(payment).toBeTruthy();

        const transaction = await prisma.transaction.create({
            data: {
                amount: new Prisma.Decimal(500),
                date,
                description: "Payment for room",
                type: "INCOME",
                location_id: base.base.locationId,
                related_id: {
                    payment_id: payment.id,
                    deposit_id: base.booking.deposit?.id
                }
            }
        });

        // update deposit status
        await prisma.deposit.update({
            where: {booking_id: base.booking.id},
            data: {
                status: DepositStatus.REFUNDED,
                applied_at: new Date(),
                refunded_amount: new Prisma.Decimal(500),
                refunded_at: new Date(),
            }
        });

        expect(transaction).toBeTruthy();

        const getPayment = () => {
            return prisma.payment.findFirst({
                where: {id: payment.id}
            });
        };

        expect(await getPayment()).toBeTruthy();

        await deleteTransactionAction(transaction.id);

        expect(await getPayment()).toBeNull();

        const deposit = await prisma.deposit.findFirst({
            where: {booking_id: base.booking.id}
        });

        expect(deposit).toBeTruthy();
        expect(deposit!.status).toEqual(DepositStatus.UNPAID);
        expect(deposit!.applied_at).toBeNull();
        expect(deposit!.refunded_amount).toBeNull();
        expect(deposit!.refunded_at).toBeNull();

        expect(await prisma.transaction.findFirst({where: {id: transaction.id}})).toBeNull();
    });

    it('deletes the transaction and associated payment, and handles missing deposit', async () => {
        const base = await seedBookingWithBills(true);
        const date = new Date();
        const payment = await prisma.payment.create({
            data: {
                booking_id: base.booking.id,
                amount: new Prisma.Decimal(500),
                payment_date: date
            }
        });

        expect(payment).toBeTruthy();

        const transaction = await prisma.transaction.create({
            data: {
                amount: new Prisma.Decimal(500),
                date,
                description: "Payment for room",
                type: "INCOME",
                location_id: base.base.locationId,
                related_id: {
                    payment_id: payment.id,
                    deposit_id: base.booking.deposit?.id
                }
            }
        });

        // delete deposit
        await prisma.deposit.delete({
            where: {booking_id: base.booking.id},
        });

        expect(transaction).toBeTruthy();

        const getPayment = () => {
            return prisma.payment.findFirst({
                where: {id: payment.id}
            });
        };

        expect(await getPayment()).toBeTruthy();

        await deleteTransactionAction(transaction.id);

        expect(await getPayment()).toBeNull();

        expect(await prisma.transaction.findFirst({where: {id: transaction.id}})).toBeNull();
    });

    it('deletes the transaction, and handles missing deposit and payment', async () => {
        const base = await seedBookingWithBills(true);
        const date = new Date();
        const payment = await prisma.payment.create({
            data: {
                booking_id: base.booking.id,
                amount: new Prisma.Decimal(500),
                payment_date: date
            }
        });

        expect(payment).toBeTruthy();

        const transaction = await prisma.transaction.create({
            data: {
                amount: new Prisma.Decimal(500),
                date,
                description: "Payment for room",
                type: "INCOME",
                location_id: base.base.locationId,
                related_id: {
                    payment_id: payment.id,
                    deposit_id: base.booking.deposit?.id
                }
            }
        });

        // delete deposit and payment
        await prisma.deposit.delete({
            where: {booking_id: base.booking.id},
        });

        await prisma.payment.delete({
            where: {id: payment.id}
        });

        expect(transaction).toBeTruthy();

        await deleteTransactionAction(transaction.id);

        expect(await prisma.transaction.findFirst({where: {id: transaction.id}})).toBeNull();
    });
});
