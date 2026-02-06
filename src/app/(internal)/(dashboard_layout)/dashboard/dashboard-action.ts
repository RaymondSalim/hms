"use server";

import type {GroupedIncomeExpenseArgs} from "@/app/_db/dashboard";
import {getGroupedIncomeExpense, getOverviewData, getRecentTransactions} from "@/app/_db/dashboard";
import {serializeForClient} from "@/app/_lib/util/prisma";
import {Period} from "@/app/_enum/financial";

const toClient = <T>(value: T) => serializeForClient(value);

export async function getOverviewDataAction(locationID?: number) {
  return getOverviewData(locationID).then(toClient);
}

export async function getGroupedIncomeExpenseAction(
  periodOrOptions: Period | GroupedIncomeExpenseArgs,
  locationID?: number,
  splitDeposit?: boolean
) {
  return getGroupedIncomeExpense(periodOrOptions, locationID, splitDeposit).then(toClient);
}

export async function getRecentTransactionsAction(locationID?: number, includeDeposit?: boolean) {
  return getRecentTransactions(locationID, includeDeposit).then(toClient);
}
