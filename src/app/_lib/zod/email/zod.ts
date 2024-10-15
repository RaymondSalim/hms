import {array, object, string} from "zod";

export const emailSchema = object({
    to: array(string().email("To field must be an email address"), {required_error: "To array field is required"}),
    subject: string().min(1, "Subject must not be empty"),
    body: string().min(1, "Body must not be empty")
});