import {array, object, string} from "zod";

export const emailSchema = object({
    to: array(string().email('Field "To" harus berupa alamat email'), {required_error: "To array field is required"}),
    subject: string().min(1, "Subject must not be empty"),
    body: string().min(1, "Body must not be empty")
});