import {number, z, ZodIssueCode} from "zod";

// Addon Pricing Schema
const AddonPricingSchema = z.object({
    // id: z.string().min(1, "ID is required").optional(),
    id: z.string().uuid().optional(),
    addon_id: z.string().uuid().optional(),
    interval_start: z.number().min(0, "Jangka Waktu mulai harus lebih besar daripada 0").int(),
    interval_end: z.number().nullable().optional(),
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
    addon_id: z.string().min(1, "ID is required").optional(),
    input: z.any().optional(), // Optional input field
    start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid start date",
    }),
    end_date: z.string().nullable().optional()
        .refine((date) => (date !== null && !isNaN(Date.parse(date!))), {
            message: "Invalid end date",
        }),
});

export { AddonPricingSchema, AddonSchema, BookingAddonSchema };