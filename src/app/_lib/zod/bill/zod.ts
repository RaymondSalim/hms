import {date, number, object, string, union} from "zod";
import {isoDateStringToDate} from "@/app/_lib/zod/base/zod";

export const billSchema = object({
    booking_id: number().min(1, "Booking ID is required"),
    description: string().min(1, "Description is required").optional(),
    due_date: union([isoDateStringToDate({required_error: "Due date is required"}), date({required_error: "Due date is required"})]),
});

export const billSchemaWithOptionalID = billSchema.extend({
    id: number().positive("ID must be a positive number").optional(),
});
