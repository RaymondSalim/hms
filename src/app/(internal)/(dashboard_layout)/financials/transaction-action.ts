"use server";

import {transactionSchema} from "@/app/_lib/zod/transaction/zod";
import {Prisma, Transaction} from "@prisma/client";
import {GenericActionsType} from "@/app/_lib/actions";
import prisma from "@/app/_lib/primsa";

/**
 * Creates or Updates a transaction based on the presence of an ID.
 * @param transactionData The transaction data object.
 */
export async function upsertTransactionAction(
    transactionData: Partial<Transaction>
): Promise<GenericActionsType<Transaction>> {
    const { success, data, error } = transactionSchema.safeParse(transactionData);

    if (!success) {
        return {
            // @ts-expect-error amount type
            errors: error.format(),
        };
    }

    try {
        let result: Transaction;

        if (data.id) {
            // Update existing transaction
            result = await prisma.transaction.update({
                where: { id: data.id },
                data: {
                    amount: new Prisma.Decimal(data.amount),
                    description: data.description,
                    date: data.date,
                    category: data.category,
                    location_id: data.location_id,
                    type: data.type,
                },
            });
        } else {
            // Create a new transaction
            result = await prisma.transaction.create({
                data: {
                    amount: new Prisma.Decimal(data.amount),
                    description: data.description,
                    date: data.date,
                    category: data.category,
                    location_id: data.location_id,
                    type: data.type,
                },
            });
        }

        return { success: result };
    } catch (err) {
        console.error('[upsertTransaction]', err);
        return {
            failure: 'An error occurred while processing the transaction.',
        };
    }
}

// Action to delete a Transaction
export async function deleteTransactionAction(id: number): Promise<GenericActionsType<Transaction>> {
    try {
        const deletedTransaction = await prisma.transaction.delete({
            where: { id },
        });
        return { success: deletedTransaction };
    } catch (error) {
        console.error("[deleteTransaction]", error);
        return { failure: "Error deleting transaction" };
    }
}

