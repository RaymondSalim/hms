import {Prisma} from "@prisma/client";
import {date, number, object, string} from "zod";

export const paymentSchema = object({
  id: number().min(1, "ID should be greater than 0").optional(),
  booking_id: number().min(1, "Booking ID is required"),
  amount: number().positive("Amount must be a positive number"),
  payment_date: date({required_error: "Payment date is required"}),
  // TODO! Payment Proof
  payment_proof: string().optional(),
  status_id: number({required_error: "Status ID is required"}).min(1, "Status ID should be greater than zero"),

  numeric_amount: number().nullish()
})
  .superRefine(arg => {
    if (arg.amount) {
      arg.numeric_amount = arg.amount;
      // @ts-expect-error
      arg.amount = new Prisma.Decimal(arg.amount);
    }

    return arg;
  });
