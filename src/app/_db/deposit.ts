"use server";

import prisma from "@/app/_lib/primsa";
import {DepositStatus, Prisma} from '@prisma/client';
import {createDepositIncomeTransaction} from '@/app/_db/transaction';

export async function getAllDeposits() {
    return prisma.deposit.findMany({
        orderBy: {id: 'desc'},
    });
}

export async function createDeposit(data: { booking_id: number, amount: Prisma.Decimal, status?: DepositStatus }) {
    // Create the deposit first
    const deposit = await prisma.deposit.create({
        data: {
            booking_id: data.booking_id,
            amount: data.amount,
            status: data.status || DepositStatus.UNPAID,
        }
    });

    // Find the first bill for the booking
    const firstBill = await prisma.bill.findFirst({
        where: { booking_id: data.booking_id },
        orderBy: { due_date: 'asc' },
    });

    if (firstBill) {
        await prisma.billItem.create({
            data: {
                bill_id: firstBill.id,
                amount: data.amount,
                description: 'Deposit',
                related_id: { deposit_id: deposit.id },
                type: 'CREATED',
            }
        });
    }

    return deposit;
}

export async function updateDeposit(data: {
    id: number,
    booking_id: number,
    amount: Prisma.Decimal,
    status: DepositStatus
}) {
    return prisma.$transaction(async (tx) => {
        const updatedDeposit = await tx.deposit.update({
            where: { id: data.id },
            data: {
                booking_id: data.booking_id,
                amount: data.amount,
                status: data.status,
            }
        });

        await tx.billItem.updateMany({
            where: {
                related_id: {
                    path: ["deposit_id"],
                    equals: data.id
                }
            },
            data: {
                amount: data.amount
            }
        });

        return updatedDeposit;
    });
}

export async function deleteDeposit(id: number) {
    return prisma.$transaction(async (tx) => {
        await tx.billItem.deleteMany({
            where: {
                related_id: {
                    path: ["deposit_id"],
                    equals: id
                }
            }
        });

        return tx.deposit.delete({ where: { id } });
    });
}

export async function updateDepositStatus({
                                              depositId,
                                              newStatus,
                                              refundedAmount
                                          }: {
    depositId: number,
    newStatus: DepositStatus,
    refundedAmount?: Prisma.Decimal | number
}) {
    const deposit = await prisma.deposit.findUnique({where: {id: depositId}});
    if (!deposit) throw new Error('Deposit not found');

    if (newStatus === 'APPLIED') {
        // Recognize full deposit as income
        await createDepositIncomeTransaction({
            booking_id: deposit.booking_id,
            amount: deposit.amount,
            description: 'Deposit applied as income',
        });
        return prisma.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.APPLIED, applied_at: new Date()}
        });
    } else if (newStatus === 'PARTIALLY_REFUNDED' && refundedAmount !== undefined) {
        // Partial refund: recognize non-refunded portion as income
        const nonRefunded = new Prisma.Decimal(deposit.amount).sub(refundedAmount);
        if (nonRefunded.gt(0)) {
            await createDepositIncomeTransaction({
                booking_id: deposit.booking_id,
                amount: nonRefunded,
                description: 'Deposit partially refunded, remainder recognized as income',
            });
        }
        return prisma.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.PARTIALLY_REFUNDED, refunded_at: new Date(), refunded_amount: refundedAmount}
        });
    } else if (newStatus === 'REFUNDED') {
        // Full refund: refundedAmount must equal deposit.amount
        if (refundedAmount === undefined || !new Prisma.Decimal(refundedAmount).eq(deposit.amount)) {
            throw new Error('Full refund requires refundedAmount equal to deposit amount');
        }
        return prisma.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.REFUNDED, refunded_at: new Date(), refunded_amount: refundedAmount}
        });
    } else {
        // Just update status
        return prisma.deposit.update({
            where: {id: depositId},
            data: {status: newStatus}
        });
    }
}
