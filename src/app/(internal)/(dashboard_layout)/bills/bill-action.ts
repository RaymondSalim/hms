"use server";

import prisma from "@/app/_lib/primsa";
import {Bill, Payment, PaymentBill, Prisma} from "@prisma/client";
import {
  BillIncludePayment,
  createBill,
  getAllBillsWithBooking,
  getBillsWithPayments,
  updateBillByID
} from "@/app/_db/bills";
import {OmitIDTypeAndTimestamp, OmitTimestamp, PartialBy} from "@/app/_db/db";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {billSchemaWithOptionalID} from "@/app/_lib/zod/bill/zod";
import {number, object} from "zod";
import nodemailerClient, {EMAIL_TEMPLATES, withTemplate} from "@/app/_lib/mailer";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";

export type BillIncludePaymentAndSum = BillIncludePayment & {
  sumPaidAmount: Prisma.Decimal
};

export async function getUnpaidBillsDueAction(booking_id?: number, args?: Prisma.BillFindManyArgs): Promise<{
  total?: number,
  bills: BillIncludePaymentAndSum[]
}> {
  const bills = await getBillsWithPayments(booking_id, {
    ...args,
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
    .filter(b => !b.sumPaidAmount.equals(b.amount));

  return {
    total: totalDue.toNumber(),
    bills: unpaidBills
  };
}

export async function simulateUnpaidBillPaymentAction(balance: number, filteredBills: BillIncludePaymentAndSum[], payment_id?: number) {
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
      currPaymentBill.amount = new Prisma.Decimal(balance);
      balance = 0;
      paymentBills.push(currPaymentBill);
      break;
    } else {
      currPaymentBill.amount = outstanding;

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

export async function generatePaymentBillMappingFromPaymentsAndBills(payments: OmitTimestamp<Payment>[], bills: OmitTimestamp<Bill>[]): Promise<OmitIDTypeAndTimestamp<PaymentBill>[]> {
  const paymentBills: OmitIDTypeAndTimestamp<PaymentBill>[] = [];

  if (bills.length == 0 || payments.length == 0) {
    return paymentBills;
  }

  const billsCopy = bills.map(bill => ({...bill}));

  billsCopy.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
  payments.sort((a, b) => a.payment_date.getTime() - b.payment_date.getTime());

  let billIndex = 0;
  for (const currPayment of payments) {
    let balance = currPayment.amount;

    while (balance.gt(0) && billIndex < billsCopy.length) {
      const currBill = billsCopy[billIndex];

      if (currBill.amount.lte(balance)) {
        // Full payment of the bill
        balance = balance.minus(currBill.amount);
        paymentBills.push({
          payment_id: currPayment.id,
          bill_id: currBill.id,
          amount: currBill.amount
        });
        billIndex++;
      } else {
        // Partial payment of the bill
        paymentBills.push({
          payment_id: currPayment.id,
          bill_id: currBill.id,
          amount: balance
        });
        currBill.amount = currBill.amount.minus(balance);
        balance = new Prisma.Decimal(0);
        break;
      }
    }
  }

  return paymentBills;
}

export async function createPaymentBillsAction(balance: number, bills: BillIncludePaymentAndSum[], payment_id: number, trx?: Prisma.TransactionClient) {
  const db = trx ?? prisma;

  const simulation = await simulateUnpaidBillPaymentAction(balance, bills, payment_id);
  const {balance: newBalance, payments: paymentBills} = simulation.new;

  let updatedBills = await db.paymentBill.createMany({
    data: paymentBills
  });

  return {
    balance: newBalance,
    bills: updatedBills
  };
}

export async function getAllBillsWithBookingAndPaymentsAction(id?: number, locationID?: number, limit?: number, offset?: number) {
  return getAllBillsWithBooking(
      id,
      {
        where: {
          bookings: {
            rooms: {
              location_id: locationID
            }
          }
        },
        include: {
          paymentBills: {
            include: {
              payment: true
            }
          },
          bookings: {
            include: {
              rooms: true
            }
          }
        },
        take: limit,
        skip: offset,
      }
  );
}

export async function upsertBillAction(billData: PartialBy<OmitTimestamp<Bill>, "id">) {
  const {success, data, error} = billSchemaWithOptionalID.safeParse(billData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  let parsedBillData: PartialBy<OmitTimestamp<Bill>, "id" | "internal_description"> = {
    ...data,
    amount: new Prisma.Decimal(data?.amount),
    description: data?.description ?? "",
    internal_description: undefined,
  };

  try {
    let res;
    // Update
    if (data?.id) {
      res = await prisma.$transaction(async (tx) => {
        // @ts-ignore type error due to internal_description
        let updated = await updateBillByID(data.id!, parsedBillData);
        await syncBillsWithPaymentDate(data.booking_id, tx);
        return updated;
      });

    } else {
      // @ts-ignore type error due to internal_description
      res = await createBill(parsedBillData);
    }

    return {
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertBillAction]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Invalid Bill"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertBillAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteBillAction(id: number) {
  const { success, error, data } = object({ id: number().positive() }).safeParse({
    id: id
  });

  if (!success) {
    return {
      errors: error?.flatten()
    };
  }

  try {
    let res = await prisma.bill.delete({
      where: {
        id: data.id
      }
    });
    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}

export async function syncBillsWithPaymentDate(bookingID: number, trx: Prisma.TransactionClient, newPayments?: Payment[]) {
  let bills = await prisma.bill.findMany({
    where: {
      booking_id: bookingID
    },
    include: {
      paymentBills: {
        include: {
          payment: true
        }
      }
    }
  });
  let paymentBillsID = bills.flatMap((b) => b.paymentBills.map(pb => pb.id));
  let allPayments: Payment[] = bills.flatMap(b => b.paymentBills.map(pb => pb.payment));
  allPayments = allPayments.concat(newPayments ?? []);
  // Remove dups
  allPayments = allPayments.filter((item, index, self) =>
          index === self.findIndex((t) => (
              t.id === item.id
          ))
  );

  let generatedPaymentBills = await generatePaymentBillMappingFromPaymentsAndBills(allPayments, bills);

  let deleteRes = await trx.paymentBill.deleteMany({
    where: {
      id: {
        in: paymentBillsID,
      }
    }
  });
  let createRes = await trx.paymentBill.createManyAndReturn({
    data: [
        ...generatedPaymentBills
    ]
  });
}

export async function getUpcomingUnpaidBillsWithUsersByDate(targetDate: Date, limit?: number, offset?: number) {
  let where = {
    due_date: {
      gte: targetDate,
      lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 7),
    }
  };

  let bills = await getUnpaidBillsDueAction(undefined, {
    where: where,
    include: {
      bookings: {
        include: {
          tenants: true
        }
      }
    },
    skip: offset,
    take: limit
  });

  return {
    bills: bills,
    total: await prisma.bill.count({
      where: where
    })
  };
}

export async function sendBillEmailAction(billID: number) {
  let billData = await prisma.bill.findFirst({
    where: {
      id: billID
    },
    include: {
      bookings: {
        include: {
          tenants: true
        }
      }
    }
  });

  if (!billData) {
    return {
      failure: "Bill Not Found"
    };
  }

  const tenant = billData.bookings.tenants!;

  try {
    const template = await withTemplate(
        EMAIL_TEMPLATES.BILL_REMINDER,
        tenant.name,
        billData.id.toString(),
        formatToIDR(billData.amount.toNumber()),
        formatToDateTime(billData.due_date),
    );

    await nodemailerClient.sendMail({
      to: tenant.email!,
      subject: "Peringatan Pembayaran Tagihan",
      text: template
    });
  } catch (error) {
    console.error(error);
    return {
      failure: "Error"
    };
  }

  return {
    success: "Email Sent Successfully."
  };

}