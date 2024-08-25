"use server";

import prisma from "@/app/_lib/primsa";
import {PaymentBill, Prisma} from "@prisma/client";
import {BillIncludePayment, getBillsWithPaymentsByBookingID} from "@/app/_db/bills";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

export type BillIncludePaymentAndSum = BillIncludePayment & {
  sumPaidAmount: Prisma.Decimal
};

export async function getUnpaidBillsDueByBookingIDAction(booking_id: number): Promise<{
  total: number,
  bills: BillIncludePaymentAndSum[]
}> {
  const bills = await getBillsWithPaymentsByBookingID(booking_id, {
    orderBy: {
      due_date: "asc"
    }
  });

  let totalDue = new Prisma.Decimal(0);

  // Only get unpaid bills and also add a new field "sumPaidAmount"
  const unpaidBills: BillIncludePaymentAndSum[] = bills
    .map(b => {
      totalDue = totalDue.add(b.amount);
      const paidAmount = b.paymentBills.reduce((acc, b) => {
        return acc.add(b.amount);
      }, new Prisma.Decimal(0));

      return {
        ...b,
        sumPaidAmount: paidAmount
      };
    })
    .filter(b => b.sumPaidAmount != b.amount);

  return {
    total: totalDue.toNumber(),
    bills: unpaidBills
  };
}

export async function simulateBillPaymentAction(balance: number, filteredBills: BillIncludePaymentAndSum[], payment_id?: number) {
  const originalBalance = balance;

  // Ensure bookings is sorted by ascending order
  filteredBills.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());

  const paymentBills: OmitIDTypeAndTimestamp<PaymentBill>[] = [];

  for (let i = 0; i < filteredBills.length; i++) {
    let currBills = filteredBills[i];
    let outstanding = new Prisma.Decimal(currBills.amount);

    if (currBills.sumPaidAmount) {
      outstanding = outstanding.minus(new Prisma.Decimal(currBills.sumPaidAmount));
    }

    if (outstanding.lte(0)) {
      continue;
    }

    let currPaymentBill: OmitIDTypeAndTimestamp<PaymentBill> = {
      bill_id: currBills.id,
      payment_id: payment_id ?? 0,
      amount: new Prisma.Decimal(0)
    };

    if (balance < outstanding.toNumber()) {
      // if (!currBills.sumPaidAmount?.isZero()) {
      //   currPaymentBill.amount = currBills.sumPaidAmount.minus(balance).abs();
      // } else {
      //   currPaymentBill.amount = new Prisma.Decimal(balance);
      // }
      currPaymentBill.amount = new Prisma.Decimal(balance);
      balance = 0;
      paymentBills.push(currPaymentBill);
      break;
    } else {
      currPaymentBill.amount = outstanding;
      // if (!currBills.sumPaidAmount?.isZero()) {
      //   currPaymentBill.amount = currBills.sumPaidAmount.minus(outstanding).abs();
      // } else {
      //   currPaymentBill.amount = new Prisma.Decimal(outstanding);
      // }

      balance = balance - outstanding.toNumber();
      paymentBills.push(currPaymentBill);
    }

    if (balance == 0) {
      break;
    }
  }

  return {
    old: {
      balance: originalBalance,
      bills: filteredBills
    },
    new: {
      balance: balance,
      payments: paymentBills
    }
  };
}

export async function createPaymentBillsAction(balance: number, bills: BillIncludePaymentAndSum[], payment_id: number, trx?: Prisma.TransactionClient) {
  const db = trx ?? prisma;

  const simulation = await simulateBillPaymentAction(balance, bills, payment_id);
  const {balance: newBalance, payments: paymentBills} = simulation.new;

  let updatedBills = await db.paymentBill.createMany({
    data: paymentBills
  });

  return {
    balance: newBalance,
    bills: updatedBills
  };
}
