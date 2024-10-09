import {date, number, object, string, z} from "zod";

export const paymentSchema = object({
  id: number().min(1, "ID should be greater than 0").optional(),
  booking_id: number().min(1, "Booking ID is required"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  payment_date: date({required_error: "Payment date is required"}),
  // TODO! Payment Proof
  payment_proof_file: object({
    fileName: string(),
    fileType: string(),
    b64File: string().base64()
  }).optional(),
  status_id: number({required_error: "Status ID is required"}).min(1, "Status ID should be greater than zero"),
});
