// Custom Zod type for ISO date string validation and conversion to Date
import {z, ZodErrorMap} from "zod";

export const isoDateStringToDate = (params?: ({
    errorMap?: ZodErrorMap | undefined;
    invalid_type_error?: string | undefined;
    required_error?: string | undefined;
    message?: string | undefined;
    description?: string | undefined;
} & {
    coerce?: true | undefined;
}) | undefined) => {
    return z
        .string(params)
        .refine(
            (value) => {
                // Validate the ISO format
                return !isNaN(Date.parse(value));
            },
            {
                message: "Invalid ISO date string format",
            }
        )
        .transform((value) => {
            // Convert the valid ISO string to a Date object
            return new Date(value);
        });
};