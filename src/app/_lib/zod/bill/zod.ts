import {coerce, date, number, object, string} from "zod";

export const billSchema = object({
    booking_id: number().min(1, "Booking ID is required"),
    amount: coerce.number().min(1, "Amount is required"),
    description: string().min(1, "Description is required").optional(),
    due_date: date({required_error: "Due date is required"}),
});

export const billSchemaWithOptionalID = billSchema.extend({
    id: number().positive("ID must be a positive number").optional(),
});