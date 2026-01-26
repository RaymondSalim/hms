"use server";

import {transactionSchema} from "@/app/_lib/zod/transaction/zod";
import {DepositStatus, Prisma, Transaction} from "@prisma/client";
import {GenericActionsType} from "@/app/_lib/actions";
import prisma from "@/app/_lib/primsa";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";
import {getTransactionsWithBookingInfo} from "@/app/_db/transaction";

const toClient = <T>(value: T) => serializeForClient(value);

/**
 * Creates or Updates a transaction based on the presence of an ID.
 * @param transactionData The transaction data object.
 */
export async function upsertTransactionAction(
    transactionData: Partial<Transaction>
): Promise<GenericActionsType<Transaction>> {
    after(() => {
        serverLogger.flush();
    });
    const { success, data, error } = transactionSchema.safeParse(transactionData);

    if (!success) {
        return toClient({
            errors: error.format(),
        });
    }

    try {
        let result: Transaction;

        if (data.id) {
            // Update existing transaction
            result = await prisma.transaction.update({
                where: { id: data.id },
                data: {
                    amount: new Prisma.Decimal(data.amount).round(),
                    description: data.description,
                    date: data.date,
                    category: data.category,
                    location_id: data.location_id,
                    type: data.type,
                    related_id: data.booking_id ? { booking_id: data.booking_id } : Prisma.DbNull,
                },
            });
        } else {
            // Create a new transaction
            result = await prisma.transaction.create({
                data: {
                    amount: new Prisma.Decimal(data.amount).round(),
                    description: data.description,
                    date: data.date,
                    category: data.category,
                    location_id: data.location_id,
                    type: data.type,
                    related_id: data.booking_id ? { booking_id: data.booking_id } : Prisma.DbNull,
                },
            });
        }

        return toClient({ success: result });
    } catch (error) {
        serverLogger.error('[upsertTransactionAction]', {error});
        return toClient({
            failure: 'An error occurred while processing the transaction.',
        });
    }
}

// Action to delete a Transaction
export async function deleteTransactionAction(id: number): Promise<GenericActionsType<Transaction>> {
    after(() => {
        serverLogger.flush();
    });
    try {
        const res = await prisma.$transaction(async (tx) => {
            let deletedTransaction = await tx.transaction.delete({
                where: { id },
            });

            // @ts-expect-error invalid type
            const depositId = deletedTransaction?.related_id?.deposit_id;
            if (depositId) {
                await tx.deposit.update({
                    where: { id: depositId },
                    data: {
                        status: DepositStatus.UNPAID,
                        applied_at: null,
                        refunded_amount: null,
                        refunded_at: null,
                    }
                });
            }

            // @ts-expect-error invalid type
            const paymentId = deletedTransaction?.related_id?.payment_id;
            if (paymentId) {
                await tx.payment.delete({
                    where: { id: paymentId },
                });
            }

            return deletedTransaction;
        });

        return toClient({ success: res });
    } catch (error) {
        serverLogger.error("[deleteTransactionAction]", {error, transaction_id: id});
        return toClient({ failure: "Error deleting transaction" });
    }
}

export async function getTransactionsWithBookingInfoAction(
    ...args: Parameters<typeof getTransactionsWithBookingInfo>
) {
    return getTransactionsWithBookingInfo(...args).then(toClient);
}
