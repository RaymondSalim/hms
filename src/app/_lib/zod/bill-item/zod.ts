import {number, object, string} from "zod";

export const billItemSchema = object({
    description: string().min(1, "Deskripsi harus diisi"),
    amount: number().positive("Jumlah harus lebih dari 0"),
    internal_description: string().nullable().optional(),
});

export const billItemUpdateSchema = billItemSchema.extend({
    id: number().positive("ID harus berupa angka positif"),
});

export const billItemCreateSchema = billItemSchema.extend({
    bill_id: number().positive("ID tagihan harus berupa angka positif"),
    type: string().optional(),
}); 