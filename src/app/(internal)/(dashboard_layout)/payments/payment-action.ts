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

export async function upsertPaymentAction(reqData: OmitIDTypeAndTimestamp<Payment>) {
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

    let trxRes = await prisma.$transaction(async (tx) => {
        let finalBalance = 0;
        let res;

        try {
            let dbData: OmitIDTypeAndTimestamp<Payment> = {
                amount: new Prisma.Decimal(data?.amount),
                booking_id: booking.id,
                payment_date: data?.payment_date,
                payment_proof: s3Key,
                status_id: data?.status_id
            };

            if (data?.id) {
                res = await updatePaymentWithTransaction(data.id!, dbData, tx);
            } else {
                res = await createPaymentWithBills(dbData, tx);
                const unpaidBills = await getUnpaidBillsDueAction(booking.id);
                // @ts-expect-error billIncludeAll and BillIncludePaymentAndSum
                const simulation = await simulateUnpaidBillPaymentAction(data.amount, unpaidBills.bills, res.id);
                const {balance: newBalance} = simulation.new;

                finalBalance = newBalance;
            }

            await syncBillsWithPaymentDate(booking.id, tx, [res]);

        } catch (error) {
            console.warn("error creating/updating payment with error: ", error);
            return {
                success: false,
                error: "Internal Server Error"
            };
        }

        if (finalBalance != 0) {
            console.warn(`error creating/updating payment due to balance not zero: ${finalBalance}`);
            return {
                success: false,
                error: "Pembayaran melebihi saldo yang harus dibayarkan"
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