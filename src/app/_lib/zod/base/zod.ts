import {z, ZodErrorMap} from "zod";

type zodParams = {
    errorMap?: ZodErrorMap | undefined;
    invalid_type_error?: string | undefined;
    required_error?: string | undefined;
    message?: string | undefined;
    description?: string | undefined;
} & {
    coerce?: true | undefined;
};

export const isoDateStringToDate = (params?: zodParams) => {
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

export const jsonString = (params?: zodParams, optional: boolean = false) => {
    const stringVal = optional ? z.string(params).nullish() : z.string(params);
    const jsonVal = z.custom((val) => {
        if (optional && val == undefined) return true;
        try {
            JSON.parse(val);
            return true;
        } catch (e) {
            return false;
        }
    });
    return z.union([
        stringVal,
        jsonVal,
    ]);
};