"use server";

import {createPayment, deletePayment, getPaymentStatus, updatePaymentByID} from "@/app/_db/payment";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Payment, Prisma, TransactionType} from "@prisma/client";
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
                migrated_to_deferred_revenue: false
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
            } else {
                res = await createPaymentWithBills(dbData, tx);
                
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

            let transaction = await prisma.transaction.findFirst({
                where: {
                    related_id: {
                        path: ['payment_id'],
                        equals: parsedData.data.id!
                    }
                },
                select: {
                    id: true
                }
            });

            if (transaction) {
                await tx.transaction.delete({
                    where: {
                        id: transaction.id
                    }
                });
            }
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

export async function createPaymentWithBills(dbData: OmitIDTypeAndTimestamp<Payment>, trx?: Prisma.TransactionClient) {
    const prismaTx = trx ?? prisma;
    let res = await createPayment(dbData, prismaTx);
    await prismaTx.transaction.create({
        data: {
            location_id: res.bookings.rooms?.location_id!,
            category: "Biaya Sewa",
            amount: dbData.amount,
            date: dbData.payment_date,
            description: `Pemasukan untuk Pembayaran #${res.id}`,
            type: TransactionType.INCOME,
            related_id: {
                payment_id: res.id
            }
        }
    });

    return res;
}

export async function updatePaymentWithTransaction(id: number, dbData: OmitIDTypeAndTimestamp<Payment>, trx?: Prisma.TransactionClient) {
    const prismaTx = trx ?? prisma;
    let res = await updatePaymentByID(id, dbData, prismaTx);

    let transaction = await prisma.transaction.findFirst({
        where: {
            related_id: {
                path: ['payment_id'],
                equals: id
            }
        }
    });

    if (transaction) {
        await prismaTx.transaction.update({
            where: {
                id: transaction.id
            },
            data: {
                amount: dbData.amount,
            }
        });
    }

    return res;
}