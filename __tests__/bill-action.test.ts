import {describe, expect, test} from "@jest/globals";
import {prismaMock} from "./singleton_prisma";
import {
  generatePaymentBillMappingFromPaymentsAndBills,
  getUnpaidBillsDueAction,
  simulateUnpaidBillPaymentAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {Bill, Payment, Prisma} from "@prisma/client";
import {BillIncludePayment} from "@/app/_db/bills";
import {OmitTimestamp} from "@/app/_db/db";

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

      const unpaidBills = await getUnpaidBillsDueAction(1);
      let resp = await simulateUnpaidBillPaymentAction(2000000, unpaidBills.bills);

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

      const unpaidBills = await getUnpaidBillsDueAction(1);
      let resp = await simulateUnpaidBillPaymentAction(1250000, unpaidBills.bills);

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
              id: 0,
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
              id: 0,
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
              id: 0,
              amount: new Prisma.Decimal(350000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueAction(1);
      let resp = await simulateUnpaidBillPaymentAction(1500000, unpaidBills.bills);

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
              id: 0,
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
              id: 0,
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
              id: 0,
              amount: new Prisma.Decimal(500000),
              payment_id: 0,
              bill_id: 0
            }
          ]
        }
      ];

      // @ts-expect-error
      prismaMock.bill.findMany.mockResolvedValue(bills);

      const unpaidBills = await getUnpaidBillsDueAction(1);
      let resp = await simulateUnpaidBillPaymentAction(1500000, unpaidBills.bills);

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

      const unpaidBills = await getUnpaidBillsDueAction(1);
      let resp = await simulateUnpaidBillPaymentAction(250000, unpaidBills.bills);

      expect(resp.new.balance)
        .toBe(0);

      expect(resp.new.payments.length)
        .toBe(1);

      expect(resp.new.payments[0].amount!.toNumber())
        .toBe(250000);
    });
  });

  describe ('test simulateAllBillPaymentAction', () => {
    const today = new Date();
    test('one payment is greater and no bills', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(500000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
      ];

      const bills: OmitTimestamp<Bill>[] = [];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(0);
    });
    test('no payment and one bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(350000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(0);
    });
    test('one payment is greater than one outstanding bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(500000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 2,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 3,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        }
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(350000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(1);
      expect(paymentBills[0]).toEqual({
        amount: new Prisma.Decimal(350000),
        payment_id: 1,
        bill_id: 1
      });
    });
    test('all payments are less than one outstanding bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(500000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 2,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 3,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        }
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(2000000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(3);
      paymentBills.forEach((pb, index) => {
        expect(pb).toEqual({
          amount: new Prisma.Decimal(500000),
          payment_id: index + 1,
          bill_id: 1
        });
      });
    });
    test('some payments covers exactly one outstanding bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(1000000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 2,
          amount: new Prisma.Decimal(1000000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 3,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        }
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(2000000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(2);
      paymentBills.forEach((pb, index) => {
        expect(pb).toEqual({
          amount: new Prisma.Decimal(1000000),
          payment_id: index + 1,
          bill_id: 1
        });
      });
    });
    test('one payment is greater than two outstanding bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(6000000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 2,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 3,
          amount: new Prisma.Decimal(500000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        }
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(2500000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
        {
          id: 2,
          booking_id: 1,
          amount: new Prisma.Decimal(3500000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(2);
      paymentBills.forEach((pb, index) => {
        expect(pb).toEqual({
          amount: bills[index].amount,
          payment_id: 1,
          bill_id: bills[index].id
        });
      });
    });
    test('one payment cover more than one, but less than two outstanding bills', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(6000000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(3500000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
        {
          id: 2,
          booking_id: 1,
          amount: new Prisma.Decimal(3500000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(2);
      expect(paymentBills[0]).toEqual({
        amount: bills[0].amount,
        payment_id: 1,
        bill_id: bills[0].id
      });
      expect(paymentBills[1]).toEqual({
        amount: payments[0].amount.minus(bills[0].amount),
        payment_id: 1,
        bill_id: bills[1].id
      });
    });
    test('some payments covers multiple outstanding bill', async () => {
      const payments: OmitTimestamp<Payment>[] = [
        {
          id: 1,
          amount: new Prisma.Decimal(5000000),
          payment_date: today,
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
        {
          id: 2,
          amount: new Prisma.Decimal(4000000),
          payment_date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          booking_id: 1,
          payment_proof: null,
          status_id: null,
        },
      ];

      const bills: OmitTimestamp<Bill>[] = [
        {
          id: 1,
          booking_id: 1,
          amount: new Prisma.Decimal(3000000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
        {
          id: 2,
          booking_id: 1,
          amount: new Prisma.Decimal(3000000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
        {
          id: 3,
          booking_id: 1,
          amount: new Prisma.Decimal(3000000),
          description: "",
          due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        }
      ];

      let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

      expect(paymentBills).toHaveLength(4);
      expect(paymentBills[0]).toEqual({
        amount: new Prisma.Decimal(3000000),
        payment_id: 1,
        bill_id: 1
      });
      expect(paymentBills[1]).toEqual({
        amount: new Prisma.Decimal(2000000),
        payment_id: 1,
        bill_id: 2
      });
      expect(paymentBills[2]).toEqual({
        amount: new Prisma.Decimal(1000000),
        payment_id: 2,
        bill_id: 2
      });
      expect(paymentBills[3]).toEqual({
        amount: new Prisma.Decimal(3000000),
        payment_id: 2,
        bill_id: 3
      });
    });
  });
});
