import {object, string} from "zod";

export const tenantSchema = object({
  name: string({
    required_error: "Name Is Required"
  }).min(1, "Name is required"),
  email: string({
    required_error: "Email Is Required"
  }).email("Alamat email tidak valid").nullable(),
  phone: string({
    required_error: "Phone Is Required"
  }).nullable(),
});

export const tenantSchemaWithOptionalID = tenantSchema.extend({
  id: string().min(1, "ID is required").optional(),
});
