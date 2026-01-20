"use server";

import {getGroupedIncomeExpense, getOverviewData, getRecentTransactions} from "@/app/_db/dashboard";
import {serializeForClient} from "@/app/_lib/util/prisma";
import {Period} from "@/app/_enum/financial";
import type {GroupedIncomeExpenseArgs} from "@/app/_db/dashboard";

const toClient = <T>(value: T) => serializeForClient(value);

export async function getOverviewDataAction(locationID?: number) {
  return getOverviewData(locationID).then(toClient);
}

export async function getGroupedIncomeExpenseAction(
  periodOrOptions: Period | GroupedIncomeExpenseArgs,
  locationID?: number
) {
  return getGroupedIncomeExpense(periodOrOptions, locationID).then(toClient);
}

export async function getRecentTransactionsAction(locationID?: number) {
  return getRecentTransactions(locationID).then(toClient);
}
