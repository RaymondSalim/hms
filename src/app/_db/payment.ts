"use server";

import {Payment, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

const includeAll = {
    bookings: {
        include: {
            rooms: true,
            tenants: true
        }
    },
    paymentstatuses: true
};

const paymentIncludeAll = Prisma.validator<Prisma.PaymentDefaultArgs>()({
    include: includeAll
});

export type PaymentIncludeAll = Prisma.PaymentGetPayload<typeof paymentIncludeAll> & {
    bookings: {
        custom_id: string
    }
};

const mapCustomID = (nb: Prisma.PaymentGetPayload<typeof paymentIncludeAll>[]) => nb.map(b => ({
    ...b,
    bookings: {
        ...b.bookings,
        custom_id: `#-${b.bookings.id}`
    }
}))


export async function getAllPayments(id?: number, locationID?: number, limit?: number, offset?: number) {
    return prisma.payment.findMany({
        where: {
            id: id,
            bookings: {
                rooms: {
                    location_id: locationID,
                }
            }
        },
        include: includeAll,
        take: limit,
        skip: offset,
    })
        .then(mapCustomID);
}

export async function deletePayment(id: number) {
    return prisma.payment.delete({
        where: {
            id
        }
    });
}

export async function getPaymentStatus() {
    return prisma.paymentStatus.findMany({
        orderBy: {
            status: 'asc'
        }
    });
}

export async function updatePaymentByID(id: number, data: OmitIDTypeAndTimestamp<Payment>) {
    return prisma.payment.update({
        where: {
            id
        },
        data: {
            ...data
        },
        include: includeAll
    })
        .then(nb => ({
                ...nb,
                bookings: {
                    ...nb.bookings,
                    custom_id: `#-${nb.bookings.id}`
                },
            })
        );
}

export async function createPayment(data: OmitIDTypeAndTimestamp<Payment>, trx?: Prisma.TransactionClient) {
    const db = trx ?? prisma;

    return db.payment.create({
        data: {
            ...data,
            id: undefined
        },
        include: includeAll
    })
        .then(nb => ({
                ...nb,
                bookings: {
                    ...nb.bookings,
                    custom_id: `#-${nb.bookings.id}`
                },
            })
        );
}
