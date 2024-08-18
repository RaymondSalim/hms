import prisma from "@/app/_lib/primsa";
import {Prisma} from "@prisma/client";

export async function getUnpaidBillsDueByBookingIDAction(booking_id: number) {
  return prisma.bill.findMany({
    where: {
      booking_id: booking_id,
      paid_amount: {
        lt: prisma.bill.fields.amount
      },
      due_date: {
        lte: new Date()
      }
    },
    orderBy: {
      due_date: "asc"
    }
  });
}

export async function simulateBillPaymentAction(balance: number, booking_id: number) {
  const bills = await getUnpaidBillsDueByBookingIDAction(booking_id);

  const resp = [];
  // Ensure bookings is sorted by ascending order
  bills.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());

  for (let i = 0; i < bills.length; i++) {
    let currBills = bills[i];
    let outstanding = currBills.amount;
    if (currBills.paid_amount) {
      outstanding = currBills.amount.minus(currBills.paid_amount);
    }

    // Update booking paid_amount
    if (balance < outstanding.toNumber()) {
      if (bills[i].paid_amount) {
        bills[i].paid_amount = bills[i].paid_amount!.add(balance);
      } else {
        bills[i].paid_amount = new Prisma.Decimal(balance);
      }
      balance = 0;
      resp.push(bills[i]);
      break;
    } else {
      if (bills[i].paid_amount) {
        bills[i].paid_amount = bills[i].paid_amount!.add(outstanding);
      } else {
        bills[i].paid_amount = new Prisma.Decimal(outstanding);
      }

      balance = balance - outstanding.toNumber();
      resp.push(bills[i]);
    }
  }

  return {
    balance,
    bills: resp
  };
}

export async function updateBillsPaidAmountByBalance(balance: number, booking_id: number, trx?: Prisma.TransactionClient) {
  const db = trx ?? prisma;

  const {balance: newBalance, bills} = await simulateBillPaymentAction(balance, booking_id);

  let updatedBills = bills.map(b => {
    return db.bill.update({
      where: {
        id: b.id
      },
      data: {
        paid_amount: b.paid_amount
      }
    });
  });

  return {
    balance: newBalance,
    bills: updatedBills
  };
}
