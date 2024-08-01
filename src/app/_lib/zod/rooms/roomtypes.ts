import {number, object, string} from "zod";

export const roomTypeSchema = object({
  type: string({required_error: "Type is required"})
});

export const roomTypeSchemaWithOptionalID = roomTypeSchema.extend({
  id: number().positive().optional()
});
