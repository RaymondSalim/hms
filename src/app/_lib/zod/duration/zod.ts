import {number, object, string} from "zod";

export const durationSchema = object({
    duration: string({required_error: "Duration Name is required"}),
  month_count: number().min(0, "Month Count should be greater than 0"),
  });

export const durationSchemaWithOptionalID = durationSchema.and(object({
  id: number().positive().optional()
}));
