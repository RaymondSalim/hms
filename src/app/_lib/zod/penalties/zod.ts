import {number, object, string} from "zod";

export const penaltySchema = object({
  description: string().min(1, "Description is required"),
  amount: number().positive("Amount must be a positive number"),
});
