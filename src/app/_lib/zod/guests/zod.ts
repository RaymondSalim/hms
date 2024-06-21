import {number, object, string} from "zod";

export const guestSchema = object({
  name: string().min(1, "Name is required"),
  email: string().email("Invalid email address").optional(),
  phone: string().optional(),
});

export const guestSchemaWithID = guestSchema.extend({
  id: number().positive("ID must be a positive number"),
});
