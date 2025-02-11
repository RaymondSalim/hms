import {date, number, object, preprocess, string, union} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

export const guestSchema = object({
    name: string().min(1, "Name is required"),
    email: string().email("Email address tidak valid").nullable(),
    phone: string().nullable(),
    tenant_id: string().min(1, "Tenant ID is required"),
    booking_id: number().min(1, "Booking ID is required"),
});

export const guestSchemaWithOptionalID = guestSchema.extend({
    id: number().positive("ID must be a positive number").optional(),
});

export const guestStaySchema = object({
    id: number().optional(),
    guest_id: number({required_error: "Guest ID is required "}).min(1, "Guest ID should be greater than zero"),
    start_date: union([isoDateStringToDate({required_error: "Start date is required"}), date({required_error: "Start date is required"})]),
    end_date: union([isoDateStringToDate({required_error: "End date is required"}), date({required_error: "End date is required"})]),
    daily_fee: preprocess(
        (val) => {
            if (val == undefined) {
                return undefined;
            }

            if (typeof val == "string") {
                return Number(val);
            }

            return val;
        },
        number({required_error: "Daily Fee is required"})
            .min(1, "Daily Fee should be greater than 0")
    ),
});