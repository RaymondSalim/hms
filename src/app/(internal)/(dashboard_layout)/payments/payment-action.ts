"use server";

import {createPayment, deletePayment, getPaymentStatus, updatePaymentByID} from "@/app/_db/payment";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {DepositStatus, Payment, Prisma, TransactionType} from "@prisma/client";
import {number, object} from "zod";
import {paymentSchema} from "@/app/_lib/zod/payment/zod";
import {getBookingByIDAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import prisma from "@/app/_lib/primsa";
import {
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction,
    syncBillsWithPaymentDate
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {DeleteObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";

export async function upsertPaymentAction(reqData: OmitIDTypeAndTimestamp<Payment> & { allocationMode?: 'auto' | 'manual', manualAllocations?: Record<number, number> }) {
    const {success, data, error} = paymentSchema.safeParse(reqData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    const booking = await getBookingByIDAction(data?.booking_id, {
        bills: true
    });

    if (!booking) {
        return {
            failure: "Booking not found"
        };
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
        console.warn("error uploading to s3 with err: ", error);
        return {
            failure: "Internal Server Error"
        };
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
                        where: { payment_id: data.id }
                    });

                    // Create new paymentBill records as per manualAllocations
                    const paymentBills = Object.entries(manualAllocations)
                        .filter(([_, amount]) => Number(amount) > 0)
                        .map(([bill_id, amount]) => ({
                            payment_id: res.id,
                            bill_id: Number(bill_id),
                            amount: new Prisma.Decimal(amount)
                        }));
                    // Validate total does not exceed payment amount
                    const totalAllocated = paymentBills.reduce((sum, pb) => sum.add(pb.amount), new Prisma.Decimal(0));
                    if (!totalAllocated.eq(data.amount)) {
                        throw new Error('Total manual allocation must equal payment amount');
                    }
                    await tx.paymentBill.createMany({ data: paymentBills });
                } else {
                    // Auto allocation: sync bills with payment dates
                    await syncBillsWithPaymentDate(booking.id, tx, [res]);
                }

                // After paymentBill records are updated, create or update transactions
                await createOrUpdatePaymentTransactions(res.id, tx);
            } else {
                res = await createPayment(dbData, tx);

                if (allocationMode === 'manual' && manualAllocations) {
                    // Manual allocation: create paymentBill records as per manualAllocations
                    const paymentBills = Object.entries(manualAllocations)
                        .filter(([_, amount]) => Number(amount) > 0)
                        .map(([bill_id, amount]) => ({
                            payment_id: res.id,
                            bill_id: Number(bill_id),
                            amount: new Prisma.Decimal(amount)
                        }));
                    // Validate total does not exceed payment amount
                    const totalAllocated = paymentBills.reduce((sum, pb) => sum.add(pb.amount), new Prisma.Decimal(0));
                    if (!totalAllocated.eq(data.amount)) {
                        throw new Error('Total manual allocation must equal payment amount');
                    }
                    await tx.paymentBill.createMany({ data: paymentBills });
                } else {
                    // Auto allocation (current logic)
                    const unpaidBills = await getUnpaidBillsDueAction(booking.id);
                    // @ts-expect-error billIncludeAll and BillIncludePaymentAndSum
                    const simulation = await simulateUnpaidBillPaymentAction(data.amount, unpaidBills.bills, res.id);
                    const { payments: paymentBills } = simulation.new;
                    await tx.paymentBill.createMany({ data: paymentBills });
                    // Don't sync for new payments - we already created the records
                }

                // After all paymentBill.createMany calls (auto/manual), add:
                await createOrUpdatePaymentTransactions(res.id, tx);
            }



        } catch (error) {
            console.warn("error creating/updating payment with error: ", error);
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
        return {
            success: trxRes.data
        };
    }

    return {
        failure: trxRes.error
    };
}

export async function deletePaymentAction(id: number) {
    const parsedData = object({id: number().positive()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return {
            errors: parsedData.error.format()
        };
    }

    let payment = await prisma.payment.findFirst({
        where: {
            id: parsedData.data.id
        }
    });

    if (!payment) {
        return {
            failure: "payment not found"
        };
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
                console.warn("[deletePaymentAction] error deleting from s3 with err: ", error);
            }
        }

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);
        return {
            failure: "Error deleting payment",
        };
    }

}

export async function getPaymentStatusAction() {
    return getPaymentStatus();
}

// Helper function to get deposit ID for a booking
async function getDepositIdForBooking(bookingId: number, trx: Prisma.TransactionClient): Promise<number | null> {
    const deposit = await trx.deposit.findFirst({
        where: { booking_id: bookingId }
    });
    return deposit?.id || null;
}

// Smart function that creates or updates transactions for a payment
async function createOrUpdatePaymentTransactions(paymentId: number, trx: Prisma.TransactionClient) {
    // Get the payment and booking/location
    const payment = await trx.payment.findFirst({
        where: { id: paymentId },
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

    // Calculate deposit and non-deposit amounts from the payment
    const paymentBills = await trx.paymentBill.findMany({
        where: { payment_id: paymentId },
        include: {
            bill: {
                include: {
                    bill_item: true
                }
            }
        }
    });

    let depositAmount = new Prisma.Decimal(0);
    let regularAmount = new Prisma.Decimal(0);
    let depositIdsToUpdate: number[] = [];

    for (const paymentBill of paymentBills) {
        for (const billItem of paymentBill.bill.bill_item) {
            // Calculate proportional amount for this bill item
            const billTotal = paymentBill.bill.bill_item.reduce(
                (sum, item) => sum.add(item.amount),
                new Prisma.Decimal(0)
            );
            const itemProportion = billItem.amount.div(billTotal);
            const itemPaymentAmount = paymentBill.amount.mul(itemProportion);

            // @ts-expect-error JSON field has no type definition
            if (billItem.related_id?.deposit_id) {
                // This is a deposit item
                depositAmount = depositAmount.add(itemPaymentAmount);
                // @ts-expect-error JSON field has no type definition
                const depositId = billItem.related_id.deposit_id;
                if (depositId && !depositIdsToUpdate.includes(depositId)) {
                    depositIdsToUpdate.push(depositId);
                }
            } else {
                // This is a regular item
                regularAmount = regularAmount.add(itemPaymentAmount);
            }
        }
    }

    // Update deposit status to HELD if deposit payment is detected
    if (depositIdsToUpdate.length > 0) {
        for (const depositId of depositIdsToUpdate) {
            const deposit = await trx.deposit.findUnique({
                where: { id: depositId }
            });

            if (deposit && deposit.status === DepositStatus.UNPAID) {
                await trx.deposit.update({
                    where: { id: depositId },
                    data: { status: DepositStatus.HELD }
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
                where: { id: regularTransaction.id },
                data: {
                    amount: regularAmount,
                    date: payment.payment_date,
                    description: `Pemasukan untuk Pembayaran #${payment.id}`,
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
                        payment_id: payment.id
                    }
                }
            });
            finalRegularTransactionId = newRegularTransaction.id;
        }
    } else if (regularTransaction) {
        // Delete if amount is 0
        await trx.transaction.delete({
            where: { id: regularTransaction.id }
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
                where: { id: depositTransaction.id },
                data: {
                    amount: depositAmount,
                    date: payment.payment_date,
                    description: `Deposit diterima untuk Booking #${payment.booking_id}`,
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
                        ...(depositId && { deposit_id: depositId })
                    }
                }
            });
            finalDepositTransactionId = newDepositTransaction.id;
        }
    } else if (depositTransaction) {
        // Delete if amount is 0
        await trx.transaction.delete({
            where: { id: depositTransaction.id }
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
}

export async function updatePaymentWithTransaction(id: number, dbData: OmitIDTypeAndTimestamp<Payment>, trx?: Prisma.TransactionClient) {
    const prismaTx = trx ?? prisma;
    let res = await updatePaymentByID(id, dbData, prismaTx);
    return res;
}
