import {number, object, string, z} from "zod";

export const durationSchema = object({
    duration: string({required_error: "Duration Name is required"}),
    day_count: number().min(0, "Day Count should be greater than 0").nullable(),
    month_count: number().min(0, "Month Count should be greater than 0").nullable(),
  })
    .superRefine((input, ctx) => {
      if (input.day_count == undefined && input.month_count == undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either Day Count or Month Count should be set",
          fatal: true,
        });

        return z.NEVER;
      }

      if (input.day_count && input.month_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either Day Count or Month should be set. Not Both.",
          fatal: true
        });

        return z.NEVER;
      }
    })
;

export const durationSchemaWithOptionalID = durationSchema.and(object({
  id: number().positive().optional()
}));
