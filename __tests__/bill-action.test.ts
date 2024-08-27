import {describe, expect, test} from "@jest/globals";
import {prismaMock} from "./singleton_prisma";
import {getUnpaidBillsDueByBookingIDAction, simulateBillPaymentAction} from "@/app/(internal)/payments/bill-action";
import {Prisma} from "@prisma/client";
import {BillIncludePayment} from "@/app/_db/bills";

describe('BillAction', () => {
  describe('test simulateBillPaymentAction', () => {
    test('balance is greater than outstanding', async () => {
      const today = new Date();
      const bills: Partial<BillIncludePayment>[] = [
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: today,
          paymentBills: []
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueByBookingIDAction(1);
      let resp = await simulateBillPaymentAction(2000000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(500000);

      resp.new.payments.forEach((pb, index) => {
        expect(pb.amount?.toNumber())
          .toEqual(bills[index].amount?.toNumber());
      });
    });

    test('balance is less than outstanding', async () => {
      const today = new Date();
      const bills: Partial<BillIncludePayment>[] = [
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: today,
          paymentBills: []
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueByBookingIDAction(1);
      let resp = await simulateBillPaymentAction(1250000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(0);

      expect(resp.new.payments[0].amount?.toNumber())
        .toEqual(bills[0].amount?.toNumber());

      expect(resp.new.payments[1].amount?.toNumber())
        .toEqual(bills[1].amount?.toNumber());

      expect(resp.new.payments[2].amount?.toNumber())
        .toEqual(250000);
    });

    test('partially paid bill', async () => {
      const today = new Date();
      const bills: Partial<BillIncludePayment>[] = [
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
          paymentBills: [
            {
              amount: new Prisma.Decimal(250000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          paymentBills: [
            {
              amount: new Prisma.Decimal(300000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: today,
          paymentBills: [
            {
              amount: new Prisma.Decimal(350000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueByBookingIDAction(1);
      let resp = await simulateBillPaymentAction(1500000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(900000);

      expect(resp.new.payments[0].amount?.toNumber())
        .toEqual(250000);

      expect(resp.new.payments[1].amount?.toNumber())
        .toBe(200000);

      expect(resp.new.payments[2].amount?.toNumber())
        .toBe(150000);
    });

    test('fully paid bill', async () => {
      const today = new Date();
      const bills: Partial<BillIncludePayment>[] = [
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
          paymentBills: [
            {
              amount: new Prisma.Decimal(500000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          paymentBills: [
            {
              amount: new Prisma.Decimal(500000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: today,
          paymentBills: [
            {
              amount: new Prisma.Decimal(500000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueByBookingIDAction(1);
      let resp = await simulateBillPaymentAction(1500000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(1500000);

      expect(resp.new.payments.length)
        .toBe(0);
    });

    test('only return bills affected', async () => {
      const today = new Date();
      const bills: Partial<BillIncludePayment>[] = [
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
          paymentBills: []
        },
        {
          amount: new Prisma.Decimal(500000),
          due_date: today,
          paymentBills: []
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueByBookingIDAction(1);
      let resp = await simulateBillPaymentAction(250000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(0);

      expect(resp.new.payments.length)
        .toBe(1);

      expect(resp.new.payments[0].amount!.toNumber())
        .toBe(250000);
    });
  });
});
