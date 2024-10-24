import {number, object, string} from "zod";

const emailObject = object({
    email: string({required_error: "Email is required"})
        .min(0, "Email is required")
        .email("Alamat email tidak valid")
});

const passwordObject = object({
    password: string({required_error: "Kata sandi diperlukan"})
        .min(0, "Kata sandi diperlukan")
        .min(8, "Kata sandi harus lebih dari 8 karakter")
        .max(32, "Kata sandi harus kurang dari 32 karakter")
});

export const siteUserSchema = object({
    role_id: number().min(1, "Role ID is required"),
    name: string({required_error: "Name is required"})
        .min(3, "Name must be more than 3 characters")
        .max(32, "Name must be less than 32 characters")
})
    .merge(emailObject)
    .merge(passwordObject);

export const siteUserSchemaWithOptionalID = object({
    id: string().cuid("Invalid User ID").optional()
})
    .merge(siteUserSchema);
