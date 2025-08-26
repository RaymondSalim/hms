import {date, number, union, z, ZodIssueCode} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

// Addon Pricing Schema
const AddonPricingSchema = z.object({
    id: z.string().cuid().optional(),
    addon_id: z.string().cuid().optional(),
    interval_start: z.number().min(0, "Jangka Waktu mulai harus lebih besar daripada 0").int(),
    interval_end: z.number().nullable().optional(),
    is_full_payment: z.boolean().default(false),
    price: z.number().min(0, "Harga harus lebih besar daripada 0"),
}).superRefine((obj, ctx) => {
    if (obj.interval_end && obj.interval_end < obj.interval_start) {
        ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["interval_end"],
            message: "Jangka Selesai harus lebih besar daripada Jangka Mulai"
        });
    }
});

// Addon Schema
const AddonSchema = z.object({
    id: z.string().min(1, "ID is required").optional(),
    name: z.string().min(1, "Nama harus diisi").max(255, "Name tidak boleh melebihi 255 huruf"),
    description: z.string().nullable().optional(),
    requires_input: z.boolean().default(false),
    parent_addon_id: z.string().nullable().optional(),
    location_id: number({required_error: "ID lokasi diperlukan"}),
    pricing: z.array(AddonPricingSchema).min(1, "Setidaknya satu harga diperlukan"),
}).superRefine((obj, ctx) => {
    obj.pricing.forEach((p, index, arr) => {
        if (index != arr.length - 1) {
            if (p.interval_end == undefined) {
                ctx.addIssue({
                    code: ZodIssueCode.custom,
                    path: ["pricing", index, "interval_end"],
                    message: "Hanya boleh kosong jika harga terakhir"
                });
            }
        }
    });
});

// BookingAddon Schema
const BookingAddonSchema = z.object({
    id: z.string().cuid().optional(),
    addon_id: z.string().min(1, "ID is required").optional(),
    input: z.any().optional(), // Optional input field
    start_date: z.union([isoDateStringToDate({required_error: "Tanggal Mulai diperlukan"}), date({required_error: "Tanggal Mulai diperlukan"})]),
    end_date: z.union([isoDateStringToDate({required_error: "Tanggal Selesai diperlukan"}), date({required_error: "Tanggal Selesai diperlukan"})]).nullable().optional(),
    is_rolling: z.boolean().default(false),
}).superRefine((obj, ctx) => {
    // If not rolling, end_date is required
    if (!obj.is_rolling && !obj.end_date) {
        ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["end_date"],
            message: "Tanggal Selesai diperlukan jika layanan tidak rolling"
        });
    }
    
    // If end_date is provided, it must be after start_date
    if (obj.end_date && obj.start_date && obj.end_date <= obj.start_date) {
        ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ["end_date"],
            message: "Tanggal Selesai harus setelah Tanggal Mulai"
        });
    }
});

export { AddonPricingSchema, AddonSchema, BookingAddonSchema };