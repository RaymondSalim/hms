import { number, object, string, typeToFlattenedError} from "zod";

export const expenseObject = object({
  amount: number().positive("Amount must be a positive number"),
  description: string().min(1, "Description is required"),
  date: string().min(1, "Date is required"),
  category_id: number().optional(),
});

export const expenseObjectWithID = expenseObject.extend({
  id: number().positive("ID must be a positive number"),
});
