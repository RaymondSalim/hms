import {number, object, string} from "zod";

export const penaltySchema = object({
  amount: number().positive("Amount must be a positive number"),
  description: string().min(1, "Description is required"),
  booking_id: number().min(1, "Booking ID is required"),
});

export const penaltySchemaWithID = penaltySchema.extend({
  id: number().positive("ID must be a positive number"),
});
