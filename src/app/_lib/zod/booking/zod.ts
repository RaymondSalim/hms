import {boolean, date, number, object, preprocess, string, union, z} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";
import {BookingAddonSchema} from "@/app/_lib/zod/addon/zod";

export const bookingSchema = object({
    id: number().min(1, "ID should be greater than 0").optional(),
    is_rolling: boolean().optional(),
    room_id: number({required_error: "Room ID is required "}).min(1, "Room ID should be greater than zero"),
    start_date: union([isoDateStringToDate({required_error: "Start date is required"}), date({required_error: "Start date is required"})]),
    end_date: union([isoDateStringToDate({required_error: "End date is required"}), date({required_error: "End date is required"})]).optional().nullable(),
    duration_id: number({required_error: "Duration ID is required"}).min(1, "Duration ID should be greater than zero").nullable().optional(),
    status_id: number({required_error: "Status ID is required"}).min(1, "Status ID should be greater than zero"),
    tenant_id: string({required_error: "Tenant ID is required"}).cuid("Invalid Tenant ID"),
    fee: preprocess(
        (val) => {
            if (val == undefined) {
                return undefined;
            }

            if (typeof val == "string") {
                return Number(val);
            }

            return val;
        },
        number({required_error: "Fee is required"})
            .min(1, "Fee should be greater than 0")
    ),
    deposit: z.object({
        amount: preprocess(
            (val) => {
                if (val == undefined) return undefined;
                if (typeof val == "string") return Number(val);
                return val;
            },
            number({ required_error: "Deposit perlu diisi" }).min(1, "Deposit harus lebih besar daripada 0")
        ),
        status: z.enum(["UNPAID", "HELD", "APPLIED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional()
    }).optional(),
    second_resident_fee: preprocess(
        (val) => {
            if (val == undefined) {
                return undefined;
            }

            if (typeof val == "string") {
                return Number(val);
            }

            return val;
        },
        number({required_error: "Tambahan harga perlu diisi"})
            .min(0, "Tambahan harga harus lebih besar atau sama dengan 0").optional()
    ).optional(),
    addOns: z.array(BookingAddonSchema).optional(), // Addons associated with the booking
}).superRefine((data, ctx) => {
    if (data.is_rolling) {
        if (data.duration_id !== null && data.duration_id !== undefined) {
            ctx.addIssue({
                code: "custom",
                message: "Duration ID must be null for rolling bookings",
                path: ["duration_id"],
            });
        }
    } else {
        if (data.duration_id === null || data.duration_id === undefined) {
            ctx.addIssue({
                code: "custom",
                message: "Duration ID is required for non-rolling bookings",
                path: ["duration_id"],
            });
        }
    }
});

const depositSchema = z.object({
    amount: preprocess(
        (val) => {
            if (val == undefined) return undefined;
            if (typeof val == "string") return Number(val);
            return val;
        },
        number({ required_error: "Deposit perlu diisi" }).min(1, "Deposit harus lebih besar daripada 0")
    ),
    status: z.enum(["UNPAID", "HELD", "APPLIED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional()
});

export type BookingDepositSchema = z.infer<typeof depositSchema>;
