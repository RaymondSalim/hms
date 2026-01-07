import {Transaction} from "@prisma/client";
import {GroupedIncomeExpense, SimplifiedIncomeExpense} from "@/app/_db/dashboard";
import type {ChartData} from "chart.js";

export function convertGroupedTransactionsToTotals(groupedData: GroupedIncomeExpense): SimplifiedIncomeExpense {
  const { labels, incomeData, expenseData } = groupedData;

  const totalIncomeData = incomeData.map((transactions) => transactions.reduce((sum, tx) => sum + Number(tx.amount), 0));

  const totalExpenseData = expenseData.map((transactions) => transactions.reduce((sum, tx) => sum + Number(tx.amount), 0));

  return {
    labels,
    incomeData: totalIncomeData,
    expenseData: totalExpenseData,
  };
}

export function preparePieChartData(transactions: Transaction[]): ChartData<"pie", number[]> {
  const categoryGroups: Record<string, number> = transactions.reduce((acc, transaction) => {
    const category = transaction.category || "Uncategorized";
    acc[category] = (acc[category] || 0) + Number(transaction.amount);
    return acc;
  }, {} as Record<string, number>);

  const labels = Object.keys(categoryGroups);
  const data = Object.values(categoryGroups);

  return {
    labels,
    datasets: [
      {
        data,
        hoverOffset: 4,
      },
    ],
  };
}
