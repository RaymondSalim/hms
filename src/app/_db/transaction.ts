import {$Enums, Transaction} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";
import TransactionType = $Enums.TransactionType;

export async function getTransactions(id?: number, limit?: number, offset?: number, type?: TransactionType) {
  return prisma.transaction.findMany({
    where: {
      id: id,
      type: type,
    },
    skip: offset,
    take: limit,
  });
}

export async function createTransaction(transactionData: OmitIDTypeAndTimestamp<Transaction>) {
  return prisma.transaction.create({
    data: {
      amount: transactionData.amount,
      description: transactionData.description,
      date: transactionData.date,
      category: transactionData.category,
      location_id: transactionData.location_id,
      type: transactionData.type
    },
  });
}

export async function updateTransactionByID(id: number, expenseData: OmitIDTypeAndTimestamp<Transaction>) {
  return prisma.transaction.update({
    data: expenseData,
    where: {
      id: id,
    },
  });
}

export async function deleteTransaction(id: number) {
  return prisma.transaction.delete({
    where: {
      id: id,
    },
  });
}
