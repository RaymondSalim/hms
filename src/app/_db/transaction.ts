"use server";

import {Prisma, Transaction} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";
import TransactionFindManyArgs = Prisma.TransactionFindManyArgs;

export async function getTransactions(args: TransactionFindManyArgs) {
  return prisma.transaction.findMany(args);
}

export async function getTransactionsWithBookingInfo(args: TransactionFindManyArgs) {
  // First get the basic transactions
  const transactions = await prisma.transaction.findMany(args);
  
  // For transactions that have booking_id in related_id, fetch booking and room info
  const transactionsWithBookingInfo = await Promise.all(
    transactions.map(async (transaction) => {
      if (transaction.related_id && typeof transaction.related_id === 'object' && 'booking_id' in transaction.related_id) {
        const bookingId = transaction.related_id.booking_id as number;
        
        try {
          const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
              rooms: {
                include: {
                  locations: true
                }
              },
              tenants: true
            }
          });
          
          return {
            ...transaction,
            booking,
            room_number: booking?.rooms?.room_number || null,
            tenant_name: booking?.tenants?.name || null,
            location_name: booking?.rooms?.locations?.name || null
          };
        } catch (error) {
          console.error(`Error fetching booking info for transaction ${transaction.id}:`, error);
          return transaction;
        }
      }
      
      return transaction;
    })
  );
  
  return transactionsWithBookingInfo;
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

export async function createDepositIncomeTransaction({
  booking_id,
  amount,
  description,
  date,
  location_id,
  tx
}: {
  booking_id: number,
  amount: Prisma.Decimal | number,
  description?: string,
  date?: Date,
  location_id?: number,
  tx?: Prisma.TransactionClient
}) {
  const prismaClient = tx || prisma;
  
  return prismaClient.transaction.create({
    data: {
      amount: new Prisma.Decimal(amount),
      description: description || 'Deposit diterima sebagai pemasukan',
      date: date || new Date(),
      category: 'Deposit',
      location_id: location_id || 1,
      type: 'INCOME',
      related_id: { booking_id },
    }
  });
}

export async function createDepositRefundExpenseTransaction({
  booking_id,
  amount,
  description,
  date,
  location_id,
  tx
}: {
  booking_id: number,
  amount: Prisma.Decimal | number,
  description?: string,
  date?: Date,
  location_id?: number,
  tx?: Prisma.TransactionClient
}) {
  const prismaClient = tx || prisma;
  
  return prismaClient.transaction.create({
    data: {
      amount: new Prisma.Decimal(amount),
      description: description || 'Deposit dibalikan',
      date: date || new Date(),
      category: 'Deposit',
      location_id: location_id || 1,
      type: 'EXPENSE',
      related_id: { booking_id },
    }
  });
}
