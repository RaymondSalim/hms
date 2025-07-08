import {date, number, preprocess, union, z} from "zod";
import {TransactionType} from "@prisma/client";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

export const transactionSchema = z.object({
    id: number().positive("ID must be a positive number").optional(),
    amount: preprocess(
        (val) => {
            if (val == undefined) {
                return undefined;
            }

            if (typeof val == "string") {
                return Number(val);
            }

            return val;
        },
        number({required_error: "Jumlah diperlukan"})
            .min(1, "Jumlah harus lebih besar dari 0")
    ),
    description: z.string().max(255),
    date: union([isoDateStringToDate({required_error: "Tanggal perlu diisi"}), date({required_error: "Tanggal perlu diisi"})]),
    category: z.string().optional(),
    location_id: z.number().positive(),
    type: z.nativeEnum(TransactionType),
    booking_id: z.number().positive().optional(),
});
