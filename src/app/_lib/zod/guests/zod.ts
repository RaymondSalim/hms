import {number, object, string} from "zod";

export const guestSchema = object({
  name: string().min(1, "Name is required"),
  email: string().email("Invalid email address").nullable(),
  phone: string().nullable(),
  tenant_id: string().min(1, "Tenant ID is required"),
});

export const guestSchemaWithOptionalID = guestSchema.extend({
  id: number().positive("ID must be a positive number").optional(),
});
