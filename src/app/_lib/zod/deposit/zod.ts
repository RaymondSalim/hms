import {z} from "zod";
import {DepositStatus} from "@prisma/client";

export const depositSchema = z.object({
    id: z.number().optional(),
    booking_id: z.coerce.number().positive("Booking ID wajib diisi"),
    amount: z.coerce.number().positive("Jumlah harus berupa angka positif"),
    status: z.nativeEnum(DepositStatus),
    refunded_amount: z.coerce.number().optional().nullable(),
}).superRefine((data, ctx) => {
    if (!data.id && !data.booking_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Booking ID wajib diisi",
            path: ["booking_id"],
        });
    }

    if (data.status === "REFUNDED" || data.status === "PARTIALLY_REFUNDED") {
        if (!data.refunded_amount || data.refunded_amount <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Jumlah pengembalian dana wajib diisi dan harus positif untuk status ini",
                path: ["refunded_amount"],
            });
        }
    }

    if (data.status === "REFUNDED") {
        if (data.refunded_amount !== data.amount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Untuk pengembalian dana penuh, jumlah pengembalian dana harus sama dengan jumlah deposit",
                path: ["refunded_amount"],
            });
        }
    }

    if (data.status === "PARTIALLY_REFUNDED") {
        if (data.refunded_amount && data.refunded_amount >= data.amount) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Untuk pengembalian dana sebagian, jumlahnya harus lebih kecil dari jumlah deposit",
                path: ["refunded_amount"],
            });
        }
    }
});

export const updateDepositStatusSchema = z.object({
    id: z.number(),
    status: z.nativeEnum(DepositStatus),
    refunded_amount: z.coerce.number().optional().nullable(),
});
