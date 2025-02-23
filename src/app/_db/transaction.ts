"use server";

import {Prisma, Transaction} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";
import TransactionFindManyArgs = Prisma.TransactionFindManyArgs;

export async function getTransactions(args: TransactionFindManyArgs) {
  return prisma.transaction.findMany(args);
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

export async function updateTransactionByID(id: number, transactionData: OmitIDTypeAndTimestamp<Transaction>) {
  return prisma.transaction.update({
    data: {
      ...transactionData,
      related_id: transactionData.related_id ?? Prisma.DbNull
    },
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
