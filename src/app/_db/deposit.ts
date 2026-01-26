"use server";

import prisma from "@/app/_lib/primsa";
import {BillType, DepositStatus, Prisma} from '@prisma/client';
import {createDepositRefundExpenseTransaction} from '@/app/_db/transaction';

export async function getAllDeposits() {
    const deposits = await prisma.deposit.findMany({
        orderBy: {id: 'desc'},
    });

    // Get received dates from transactions using raw SQL
    const depositsWithReceivedDates = await Promise.all(
        deposits.map(async (deposit) => {
            // Find the transaction date for this deposit
            const result = await prisma.$queryRaw<Array<{date: Date}>>`
                SELECT t.date
                FROM transactions t
                JOIN payment_bills pb ON pb.payment_id = (t.related_id->>'payment_id')::int
                JOIN bill_items bi ON pb.bill_id = bi.bill_id
                WHERE t.category = 'Deposit' 
                AND t.type = 'INCOME'
                AND bi.related_id->>'deposit_id' = ${deposit.id.toString()}
                LIMIT 1
            `;

            return {
                ...deposit,
                received_date: result[0]?.date || null
            };
        })
    );

    return depositsWithReceivedDates;
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
                description: 'Deposit Kamar',
                related_id: { deposit_id: deposit.id },
                type: BillType.GENERATED
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
                                              refundedAmount,
                                              tx
                                          }: {
    depositId: number,
    newStatus: DepositStatus,
    refundedAmount?: Prisma.Decimal | number,
    tx?: Prisma.TransactionClient
}) {
    const prismaClient = tx || prisma;

    const deposit = await prismaClient.deposit.findUnique({
        where: {id: depositId},
        include: {
            booking: {
                include: {
                    rooms: {
                        include: {
                            locations: true
                        }
                    }
                }
            }
        }
    });
    if (!deposit) throw new Error('Deposit tidak ditemukan');

    const locationId = deposit.booking.rooms?.location_id || 1;
    const bookingId = deposit.booking_id;

    if (newStatus === 'APPLIED') {
        // Don't create income transaction - deposit was already counted as income when received
        // Just update the status
        return prismaClient.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.APPLIED, applied_at: new Date()}
        });
    } else if (newStatus === 'PARTIALLY_REFUNDED' && refundedAmount !== undefined) {
        // Create expense transaction for the refunded amount
        await createDepositRefundExpenseTransaction({
            booking_id: deposit.booking_id,
            amount: refundedAmount,
            description: `Deposit dibalikan sebagian untuk Booking #${bookingId}: ${new Prisma.Decimal(refundedAmount).toNumber().toLocaleString('id-ID')}`,
            location_id: locationId,
            tx: tx
        });

        return prismaClient.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.PARTIALLY_REFUNDED, refunded_at: new Date(), refunded_amount: refundedAmount}
        });
    } else if (newStatus === 'REFUNDED') {
        // Full refund: refundedAmount must equal deposit.amount
        if (refundedAmount === undefined || !new Prisma.Decimal(refundedAmount).eq(deposit.amount)) {
            throw new Error('Pengembalian dana penuh memerlukan jumlah pengembalian yang sama dengan jumlah deposit');
        }

        // Create expense transaction for the full refund
        await createDepositRefundExpenseTransaction({
            booking_id: deposit.booking_id,
            amount: refundedAmount,
            description: `Deposit dibalikan sepenuhnya untuk Booking #${bookingId}: ${new Prisma.Decimal(refundedAmount).toNumber().toLocaleString('id-ID')}`,
            location_id: locationId,
            tx: tx
        });

        return prismaClient.deposit.update({
            where: {id: depositId},
            data: {status: DepositStatus.REFUNDED, refunded_at: new Date(), refunded_amount: refundedAmount}
        });
    } else {
        // Just update status
        return prismaClient.deposit.update({
            where: {id: depositId},
            data: {status: newStatus}
        });
    }
}
