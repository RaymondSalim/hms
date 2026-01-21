"use server";

import {createPayment, deletePayment, getAllPayments, getPaymentStatus, updatePaymentByID} from "@/app/_db/payment";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {DepositStatus, Payment, Prisma, TransactionType} from "@prisma/client";
import {number, object} from "zod";
import {paymentSchema} from "@/app/_lib/zod/payment/zod";
import prisma from "@/app/_lib/primsa";
import {
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction,
    syncBillsWithPaymentDate
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {DeleteObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getBookingByID} from "@/app/_db/bookings";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export async function createPaymentBillsFromBillAllocations(
    manualAllocations: Record<number, number>,
    paymentId: number,
    paymentAmount: Prisma.Decimal | number,
    trx: Prisma.TransactionClient
) {
    // Validate total equals payment amount
    const totalAllocated = Object.values(manualAllocations)
        .reduce((sum, v) => sum + Number(v || 0), 0);
    const paymentAmt = new Prisma.Decimal(paymentAmount);
    if (!paymentAmt.eq(new Prisma.Decimal(totalAllocated))) {
        throw new Error('Total manual allocation must equal payment amount');
    }

    const paymentBills = Object.entries(manualAllocations)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([bill_id, amount]) => ({
            payment_id: paymentId,
            bill_id: Number(bill_id),
            amount: new Prisma.Decimal(amount)
        }));

    if (paymentBills.length > 0) {
        await trx.paymentBill.createMany({data: paymentBills});
    }
}

export async function upsertPaymentAction(reqData: OmitIDTypeAndTimestamp<Payment> & {
    allocationMode?: 'auto' | 'manual',
    manualAllocations?: Record<number, number>
}) {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = paymentSchema.safeParse(reqData);

    if (!success) {
        return toClient({
            errors: error?.format()
        });
    }

    const booking = await getBookingByID(data?.booking_id, {
        bills: true
    });

    if (!booking) {
        return toClient({
            failure: "Booking not found"
        });
    }

    const file = data?.payment_proof_file;
    let s3Key: string | null = null;

    try {
        if (file) {
            const b64Str = file.b64File.split(',')[1];
            const buffer = Buffer.from(b64Str, 'base64');

            // Upload file to s3 first
            if (buffer) {
                const key = `booking-payments/${data?.booking_id}/${new Date().toISOString()}/${file.fileName}`;
                const client = new S3Client({region: process.env.AWS_REGION});
                const command = new PutObjectCommand({
                    Body: buffer,
                    Bucket: process.env.S3_BUCKET,
                    Key: key
                });
                const s3Resp = await client.send(command);
                s3Key = key;
            }
        }
    } catch (error) {
        serverLogger.warn("[upsertPaymentAction] error uploading to s3 with err: ", {error});
        return toClient({
            failure: "Internal Server Error"
        });
    }

    let allocationMode = reqData.allocationMode || 'auto';
    let manualAllocations = reqData.manualAllocations;

    let trxRes = await prisma.$transaction(async (tx) => {
        let res: any;

        try {
            let dbData: OmitIDTypeAndTimestamp<Payment> = {
                amount: new Prisma.Decimal(data?.amount),
                booking_id: booking.id,
                payment_date: data?.payment_date,
                payment_proof: s3Key,
                status_id: data?.status_id,
            };

            if (data?.id) {
                res = await updatePaymentWithTransaction(data.id!, dbData, tx);

                // Handle allocation for updates
                if (allocationMode === 'manual' && manualAllocations) {
                    // Delete existing payment-bill records for this payment
                    await tx.paymentBill.deleteMany({
                        where: {payment_id: data.id}
                    });

                    await createPaymentBillsFromBillAllocations(manualAllocations, res.id, dbData.amount, tx);

                    // After paymentBill records are updated, create or update transactions for this payment only
                    await createOrUpdatePaymentTransactions(res.id, tx);
                } else {
                    // Auto allocation: sync bills with payment dates
                    await syncBillsWithPaymentDate(booking.id, tx, [res]);

                    // After global reallocation, recompute transactions for ALL payments in this booking
                    const paymentIdRows = await tx.paymentBill.findMany({
                        where: {bill: {booking_id: booking.id}},
                        select: {payment_id: true}
                    });
                    const uniquePaymentIds = Array.from(new Set(paymentIdRows.map(r => r.payment_id)));
                    for (const paymentId of uniquePaymentIds) {
                        await createOrUpdatePaymentTransactions(paymentId, tx);
                    }
                }
            } else {
                res = await createPayment(dbData, tx);

                if (allocationMode === 'manual' && manualAllocations) {
                    await createPaymentBillsFromBillAllocations(manualAllocations, res.id, dbData.amount, tx);
                } else {
                    // Auto allocation (current logic)
                    const unpaidBills = await getUnpaidBillsDueAction(booking.id);
                    // @ts-expect-error billIncludeAll and BillIncludePaymentAndSum
                    const simulation = await simulateUnpaidBillPaymentAction(data.amount, unpaidBills.bills, res.id);
                    const {payments: paymentBills} = simulation.new;
                    await tx.paymentBill.createMany({data: paymentBills});
                    // Don't sync for new payments - we already created the records
                }

                // After all paymentBill.createMany calls (auto/manual), add:
                await createOrUpdatePaymentTransactions(res.id, tx);
            }


        } catch (error) {
            serverLogger.warn("error creating/updating payment with error: ", {error});
            return {
                success: false,
                error: error instanceof Error ? error.message : "Internal Server Error"
            };
        }

        return {
            success: true,
            data: res
        };
    }, {
        timeout: 60000, // TODO! Remove
    });

    if (trxRes.success) {
        return toClient({
            success: trxRes.data
        });
    }

    return toClient({
        failure: trxRes.error
    });
}

export async function deletePaymentAction(id: number) {
    after(() => {
        serverLogger.flush();
    });
    const parsedData = object({id: number().positive()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return toClient({
            errors: parsedData.error.format()
        });
    }

    let payment = await prisma.payment.findFirst({
        where: {
            id: parsedData.data.id
        }
    });

    if (!payment) {
        return toClient({
            failure: "payment not found"
        });
    }

    const client = new S3Client({region: process.env.AWS_REGION});

    try {
        let res;
        await prisma.$transaction(async (tx) => {
            res = await deletePayment(parsedData.data.id);

            // Delete all transactions related to this payment
            await tx.transaction.deleteMany({
                where: {
                    related_id: {
                        path: ['payment_id'],
                        equals: parsedData.data.id!
                    }
                }
            });
        });

        if (payment.payment_proof) {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET,
                    Key: payment.payment_proof
                });
                await client.send(command);
            } catch (error) {
                serverLogger.warn("[deletePaymentAction] error deleting from s3", {error});
            }
        }

        return toClient({
            success: res,
        });
    } catch (error) {
        serverLogger.error("[deletePaymentAction]", {error});
        return toClient({
            failure: "Error deleting payment",
        });
    }

}

export async function getPaymentStatusAction() {
    return getPaymentStatus().then(toClient);
}

export async function getAllPaymentsAction(...args: Parameters<typeof getAllPayments>) {
    return getAllPayments(...args).then(toClient);
}

// Helper function to get deposit ID for a booking
async function getDepositIdForBooking(bookingId: number, trx: Prisma.TransactionClient): Promise<number | null> {
    const deposit = await trx.deposit.findFirst({
        where: {booking_id: bookingId}
    });
    return deposit?.id || null;
}

// Smart function that creates or updates transactions for a payment
export const createOrUpdatePaymentTransactions = async function (
    paymentId: number,
    trx: Prisma.TransactionClient
) {
    const payment = await trx.payment.findFirst({
        where: {id: paymentId},
        include: {
            bookings: {
                include: {
                    rooms: true
                }
            }
        }
    });
    if (!payment) return;
    const locationId = payment.bookings?.rooms?.location_id || 1;

    let depositAmount = new Prisma.Decimal(0);
    let regularAmount = new Prisma.Decimal(0);
    let depositIdsToUpdate: number[] = [];

    // Compute amounts from actual PaymentBill entries, prioritizing deposit items within each bill
    const paymentBills = await trx.paymentBill.findMany({
        where: {payment_id: paymentId},
        include: {
            bill: {
                include: {
                    bill_item: true
                }
            }
        }
    });

    for (const paymentBill of paymentBills) {
        // Split this paymentBill amount across bill items giving priority to deposit items
        const items = paymentBill.bill.bill_item.slice().sort((a, b) => {
            // @ts-expect-error JSON field has no type definition
            const aDep = !!a.related_id?.deposit_id;
            // @ts-expect-error JSON field has no type definition
            const bDep = !!b.related_id?.deposit_id;
            if (aDep && !bDep) return -1;
            if (!aDep && bDep) return 1;
            return 0;
        });

        let remaining = new Prisma.Decimal(paymentBill.amount);
        for (const item of items) {
            if (remaining.lte(0)) break;
            const toApply = Prisma.Decimal.min(remaining, item.amount);
            // @ts-expect-error JSON field has no type definition
            if (item.related_id?.deposit_id) {
                depositAmount = depositAmount.add(toApply);
                // @ts-expect-error JSON field has no type definition
                const depId = item.related_id.deposit_id;
                if (depId && !depositIdsToUpdate.includes(depId)) {
                    depositIdsToUpdate.push(depId);
                }
            } else {
                regularAmount = regularAmount.add(toApply);
            }
            remaining = remaining.sub(toApply);
        }
    }

    // Update deposit status to HELD if deposit payment is detected
    if (depositIdsToUpdate.length > 0) {
        for (const depositId of depositIdsToUpdate) {
            const deposit = await trx.deposit.findUnique({
                where: {id: depositId}
            });

            if (deposit && deposit.status === DepositStatus.UNPAID) {
                await trx.deposit.update({
                    where: {id: depositId},
                    data: {status: DepositStatus.HELD}
                });
            }
        }
    }

    // Get existing transactions for this payment
    const existingTransactions = await trx.transaction.findMany({
        where: {
            related_id: {
                path: ['payment_id'],
                equals: paymentId
            }
        }
    });

    // Find or create regular income transaction
    const regularTransaction = existingTransactions.find(t =>
        t.category === "Biaya Sewa" &&
        // @ts-expect-error JSON field has no type def
        !t.related_id?.deposit_id
    );

    let finalRegularTransactionId: number | null = null;

    if (regularAmount.gt(0)) {
        if (regularTransaction) {
            // Update existing transaction
            await trx.transaction.update({
                where: {id: regularTransaction.id},
                data: {
                    amount: regularAmount,
                    date: payment.payment_date,
                    description: `Pemasukan untuk Pembayaran #${payment.id}`,
                    related_id: {
                        payment_id: payment.id,
                        booking_id: payment.booking_id
                    }
                }
            });
            finalRegularTransactionId = regularTransaction.id;
        } else {
            // Create new transaction
            const newRegularTransaction = await trx.transaction.create({
                data: {
                    location_id: locationId,
                    category: "Biaya Sewa",
                    amount: regularAmount,
                    date: payment.payment_date,
                    description: `Pemasukan untuk Pembayaran #${payment.id}`,
                    type: TransactionType.INCOME,
                    related_id: {
                        payment_id: payment.id,
                        booking_id: payment.booking_id
                    }
                }
            });
            finalRegularTransactionId = newRegularTransaction.id;
        }
    } else if (regularTransaction) {
        // Delete if amount is 0
        await trx.transaction.delete({
            where: {id: regularTransaction.id}
        });
    }

    // Find or create deposit transaction
    const depositTransaction = existingTransactions.find(t =>
        t.category === "Deposit" &&
        // @ts-expect-error JSON field has no type def
        (t.related_id?.deposit_id === true || typeof t.related_id?.deposit_id === 'number')
    );

    let finalDepositTransactionId: number | null = null;

    if (depositAmount.gt(0)) {
        if (depositTransaction) {
            // Update existing transaction
            await trx.transaction.update({
                where: {id: depositTransaction.id},
                data: {
                    amount: depositAmount,
                    date: payment.payment_date,
                    description: `Deposit diterima untuk Booking #${payment.booking_id}`,
                    related_id: {
                        payment_id: payment.id,
                        booking_id: payment.booking_id,
                        ...(depositTransaction.related_id && typeof depositTransaction.related_id === 'object' && 'deposit_id' in depositTransaction.related_id && {deposit_id: depositTransaction.related_id.deposit_id})
                    }
                }
            });
            finalDepositTransactionId = depositTransaction.id;
        } else {
            // Get the actual deposit ID for this booking
            const depositId = await getDepositIdForBooking(payment.booking_id, trx);

            // Create new transaction
            const newDepositTransaction = await trx.transaction.create({
                data: {
                    location_id: locationId,
                    category: "Deposit",
                    amount: depositAmount,
                    date: payment.payment_date,
                    description: `Deposit diterima untuk Booking #${payment.booking_id}`,
                    type: TransactionType.INCOME,
                    related_id: {
                        payment_id: payment.id,
                        booking_id: payment.booking_id,
                        ...(depositId && {deposit_id: depositId})
                    }
                }
            });
            finalDepositTransactionId = newDepositTransaction.id;
        }
    } else if (depositTransaction) {
        // Delete if amount is 0
        await trx.transaction.delete({
            where: {id: depositTransaction.id}
        });
    }

    // Delete any other transactions that shouldn't exist
    const validTransactionIds: number[] = [
        finalRegularTransactionId,
        finalDepositTransactionId
    ].filter((id): id is number => id !== null);

    await trx.transaction.deleteMany({
        where: {
            related_id: {
                path: ['payment_id'],
                equals: paymentId
            },
            id: {
                notIn: validTransactionIds
            }
        }
    });

    // Ensure deposit status stays consistent with presence of deposit income transactions across the booking
    const bookingDeposit = await trx.deposit.findFirst({
        where: {booking_id: payment.booking_id}
    });
    if (bookingDeposit && (bookingDeposit.status === DepositStatus.UNPAID || bookingDeposit.status === DepositStatus.HELD)) {
        const depositIncomeCount = await trx.transaction.count({
            where: {
                category: "Deposit",
                type: TransactionType.INCOME,
                related_id: {
                    path: ['booking_id'],
                    equals: payment.booking_id
                }
            }
        });

        if (depositIncomeCount > 0 && bookingDeposit.status === DepositStatus.UNPAID) {
            await trx.deposit.update({
                where: {id: bookingDeposit.id},
                data: {status: DepositStatus.HELD}
            });
        } else if (depositIncomeCount === 0 && bookingDeposit.status === DepositStatus.HELD) {
            await trx.deposit.update({
                where: {id: bookingDeposit.id},
                data: {status: DepositStatus.UNPAID}
            });
        }
    }
};

export async function updatePaymentWithTransaction(id: number, dbData: OmitIDTypeAndTimestamp<Payment>, trx?: Prisma.TransactionClient) {
    const prismaTx = trx ?? prisma;
    let res = await updatePaymentByID(id, dbData, prismaTx);
    return res;
}
