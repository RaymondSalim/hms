import {expenseObject, expenseObjectWithID} from "@/app/_lib/zod/expenses/zod";
import {Expense, Prisma} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {createTransaction, deleteTransaction, updateTransactionByID} from "@/app/_db/transaction";
import {number, object} from "zod";

export type ExpenseActionsType<T = OmitIDTypeAndTimestamp<Expense>> = {
    success?: string | Expense;
    failure?: string;
    errors?: Partial<Expense>;
};

export async function createExpenseAction(prevState: ExpenseActionsType, formData: FormData): Promise<ExpenseActionsType> {
    // TODO! Ensure date is in UTC
    const parsedData = expenseObject.safeParse({
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description"),
        date: formData.get("date"),
        category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : null,
        location_id: formData.get("location_id") ? parseInt(formData.get("category_id") as string) : null
    });

    if (!parsedData.success) {
        return {
            errors: Object.fromEntries(parsedData.error.errors.entries()),
        };
    }

    try {
        let res = await createTransaction({
            ...parsedData.data,
            category_id: parsedData.data.category_id,
            date: new Date(parsedData.data.date),
            amount: new Prisma.Decimal(parsedData.data.amount)
        });

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "Error creating expense",
        };
    }
}

export async function updateExpenseAction(prevState: ExpenseActionsType, formData: FormData): Promise<ExpenseActionsType> {
    // TODO! Ensure date is in UTC
    const parsedData = expenseObjectWithID.safeParse({
        id: parseInt(formData.get("id") as string),
        amount: parseFloat(formData.get("amount") as string),
        description: formData.get("description"),
        date: formData.get("date"),
        category_id: formData.get("category_id") ? parseInt(formData.get("category_id") as string) : undefined,
    });

    if (!parsedData.success) {
        return {
            errors: Object.fromEntries(parsedData.error.errors.entries()),
        };
    }

    try {
        let res = await updateTransactionByID(parsedData.data.id, {
            ...parsedData.data,
            category_id: parsedData.data.category_id ?? null,
            date: new Date(parsedData.data.date),
            amount: new Prisma.Decimal(parsedData.data.amount)
        });

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "Error updating expense",
        };
    }
}

export async function deleteExpenseAction(prevState: ExpenseActionsType<Pick<Expense, "id">>, formData: FormData): Promise<ExpenseActionsType<Pick<Expense, "id">>> {
    const parsedData = object({id: number().positive()}).safeParse({
        id: parseInt(formData.get("id") as string),
    });

    if (!parsedData.success) {
        return {
            errors: Object.fromEntries(parsedData.error.errors.entries()),
        };
    }

    try {
        let res = await deleteTransaction(parsedData.data.id);

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "Error deleting expense",
        };
    }
}
