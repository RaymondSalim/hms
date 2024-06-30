import {Expense, PrismaClient} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

const prisma = new PrismaClient();

export async function getExpenses(id?: number, limit?: number, offset?: number) {
  return prisma.expense.findMany({
    where: id ? { id } : undefined,
    skip: offset,
    take: limit,
  });
}

export async function createExpense(expenseData: OmitIDTypeAndTimestamp<Expense>) {
  return prisma.expense.create({
    data: {
      amount: expenseData.amount,
      description: expenseData.description,
      date: expenseData.date,
      category_id: expenseData.category_id,
      location_id: expenseData.location_id,
    },
  });
}

export async function updateExpenseByID(id: number, expenseData: OmitIDTypeAndTimestamp<Expense>) {
  return prisma.expense.update({
    data: expenseData,
    where: {
      id: id,
    },
  });
}

export async function deleteExpense(id: number) {
  return prisma.expense.delete({
    where: {
      id: id,
    },
  });
}
