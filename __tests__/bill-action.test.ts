import {beforeEach, describe, expect, it, test} from "@jest/globals";
import {prismaMock} from "./singleton_prisma";
import {
    generateBookingAddonsBillItems,
    generateBookingBillandBillItems,
    generatePaymentBillMappingFromPaymentsAndBills,
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {AddOnPricing, BillType, Booking, BookingAddOn, Payment, Prisma} from "@prisma/client";
import {BillIncludeBillItem, BillIncludePayment} from "@/app/_db/bills";
import {OmitIDTypeAndTimestamp, OmitTimestamp} from "@/app/_db/db";
import {matchBillItemsToBills} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";

describe('BillAction', () => {
    describe('test simulateBillPaymentAction', () => {
        test('balance is greater than outstanding', async () => {
            const today = new Date();
            const bills: Partial<BillIncludePayment>[] = [
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: today,
                    paymentBills: []
                }
            ];

            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue(bills);

            const unpaidBills = await getUnpaidBillsDueAction(1);
            // @ts-expect-error TS2345
            let resp = await simulateUnpaidBillPaymentAction(2000000, unpaidBills.bills);

            expect(resp.new.balance)
                .toBe(500000);

            resp.new.payments.forEach((pb, index) => {
                expect(pb.amount?.toNumber())
                    .toEqual(
                        bills[index].bill_item?.reduce(
                            (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                        ).toNumber()
                    );
            });
        });

        test('balance is less than outstanding', async () => {
            const today = new Date();
            const bills: Partial<BillIncludePayment>[] = [
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: today,
                    paymentBills: []
                }
            ];

            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue(bills);

            const unpaidBills = await getUnpaidBillsDueAction(1);
            // @ts-expect-error TS2345
            let resp = await simulateUnpaidBillPaymentAction(1250000, unpaidBills.bills);

            expect(resp.new.balance)
                .toBe(0);

            expect(resp.new.payments[0].amount?.toNumber())
                .toEqual(bills[0].bill_item?.reduce(
                    (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                ).toNumber());

            expect(resp.new.payments[1].amount?.toNumber())
                .toEqual(bills[1].bill_item?.reduce(
                    (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                ).toNumber());

            expect(resp.new.payments[2].amount?.toNumber())
                .toEqual(250000);
        });

        test('partially paid bill', async () => {
            const today = new Date();
            const bills: Partial<BillIncludePayment>[] = [
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
            // @ts-expect-error TS2345
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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
            // @ts-expect-error TS2345
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
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()),
                    paymentBills: []
                },
                {
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    due_date: today,
                    paymentBills: []
                }
            ];

            // @ts-expect-error
            prismaMock.bill.findMany.mockResolvedValue(bills);

            const unpaidBills = await getUnpaidBillsDueAction(1);
            // @ts-expect-error TS2345
            let resp = await simulateUnpaidBillPaymentAction(250000, unpaidBills.bills);

            expect(resp.new.balance)
                .toBe(0);

            expect(resp.new.payments.length)
                .toBe(1);

            expect(resp.new.payments[0].amount!.toNumber())
                .toBe(250000);
        });
    });

    describe('test simulateAllBillPaymentAction', () => {
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [];

            let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

            expect(paymentBills).toHaveLength(0);
        });
        test('no payment and one bill', async () => {
            const payments: OmitTimestamp<Payment>[] = [];

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(350000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(350000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(2000000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(2000000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(2500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                },
                {
                    id: 2,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                }
            ];

            let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

            expect(paymentBills).toHaveLength(2);
            paymentBills.forEach((pb, index) => {
                expect(pb).toEqual({
                    amount: bills[index].bill_item.reduce(
                        (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                    ),
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                },
                {
                    id: 2,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3500000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                }
            ];

            let paymentBills = await generatePaymentBillMappingFromPaymentsAndBills(payments, bills);

            expect(paymentBills).toHaveLength(2);
            expect(paymentBills[0]).toEqual({
                amount: bills[0].bill_item.reduce(
                    (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                ),
                payment_id: 1,
                bill_id: bills[0].id
            });
            expect(paymentBills[1]).toEqual({
                amount: payments[0].amount.minus(bills[0].bill_item.reduce(
                    (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
                )),
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

            const bills: OmitTimestamp<BillIncludeBillItem>[] = [
                {
                    id: 1,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3000000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                },
                {
                    id: 2,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3000000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
                    description: "",
                    due_date: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                },
                {
                    id: 3,
                    booking_id: 1,
                    bill_item: [
                        {
                            amount: new Prisma.Decimal(3000000),
                            id: 0,
                            bill_id: 1,
                            description: "",
                            internal_description: null,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            type: BillType.GENERATED,
                            related_id: null
                        }
                    ],
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

describe('generateBookingAddonsBillItems', () => {
    const booking: Pick<Booking, "id" | "end_date"> = {
        id: 123,
        end_date: new Date(2050, 0, 1),
    };

    const internetAddonPricing: Partial<AddOnPricing>[] = [
        {interval_start: 0, interval_end: 2, price: 300000, is_full_payment: true},
        {interval_start: 3, interval_end: null, price: 120000},
    ];

    const cleaningAddonPricing: Partial<AddOnPricing>[] = [
        {interval_start: 0, interval_end: null, price: 50000},
    ];

    const internetAddon = {
        id: 'addon-1',
        name: 'Internet',
        pricing: internetAddonPricing,
    };

    const cleaningAddon = {
        id: 'addon-2',
        name: 'Cleaning',
        pricing: cleaningAddonPricing,
    };

    beforeEach(() => {
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({where}) => {
            if (where.id === 'addon-1') {
                return Promise.resolve(internetAddon);
            }
            if (where.id === 'addon-2') {
                return Promise.resolve(cleaningAddon);
            }
            return Promise.reject(new Error('AddOn not found'));
        });
    });

    function makeBillsForMonths(months: [number, number][]): { id: number; due_date: Date }[] {
        // months: array of [year, month] (month is 0-based)
        let id = 1;
        return months.map(([y, m]: [number, number]) => ({
            id: id++,
            due_date: new Date(y, m, new Date(y, m + 1, 0).getDate()),
        }));
    }

    it('Scenario 1: Sewa 3 bulan, mulai tgl 1 Jan, selesai 31 Mar', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 31),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment: should be attached to the bill for the month of the add-on's start date (January)
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            }),
        ]);
        expect(billItems[bills[1].id]).toBeUndefined();
        expect(billItems[bills[2].id]).toBeUndefined();
    });

    it('Scenario 2: Sewa 3 bulan, mulai tgl 15 Jan, selesai 14 Apr', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 3, 14),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment: should be attached to the bill for the month of the add-on's start date (January)
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                amount: new Prisma.Decimal(300000),
            }),
        ]);
        expect(billItems[bills[1].id]).toBeUndefined();
        expect(billItems[bills[2].id]).toBeUndefined();
    });

    it('Scenario 3: Sewa 5 bulan, mulai tgl 1 Jan, selesai 31 May', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 4, 31),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar, Apr, May
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3], [2023, 4]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment for first 3 months (Jan-Mar) attached to Jan, then partials for Apr and May
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            }),
        ]);
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (April 1 - April 30)',
                amount: new Prisma.Decimal(120000),
            }),
        ]);
        expect(billItems[bills[4].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (May 1 - May 31)',
                amount: new Prisma.Decimal(120000),
            }),
        ]);
        expect(billItems[bills[1].id]).toBeUndefined()
        expect(billItems[bills[2].id]).toBeUndefined()
    });

    it('Scenario 4: Sewa 5 bulan, mulai tgl 15 Jan, selesai 14 June', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 5, 14),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar, Apr, May, Jun
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3], [2023, 4]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (April 15 - April 30)',
                amount: new Prisma.Decimal(64000),
            })
        ]);
        expect(billItems[bills[4].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (May 1 - June 14)',
                amount: new Prisma.Decimal(176000),
            })
        ]);
        expect(billItems[bills[1].id]).toBeUndefined();
        expect(billItems[bills[2].id]).toBeUndefined();
    });

    it('Scenario 5: Sewa 5 bulan, mulai tgl 15 Jan, selesai 14 June, tenant kontrak sampai 31 May', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 5, 14),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar, Apr, May, Jun
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3], [2023, 4]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment for Jan-Apr attached to Apr, then partial for May (May 1 - June 14)
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (April 15 - April 30)',
                amount: new Prisma.Decimal(64000),
            })
        ]);
        expect(billItems[bills[4].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (May 1 - June 14)',
                amount: new Prisma.Decimal(176000),
            })
        ]);
        expect(billItems[bills[1].id]).toBeUndefined();
        expect(billItems[bills[2].id]).toBeUndefined();
    });

    it('Scenario 6: Sewa 3 bulan, mulai tgl 15 Jan, selesai 14 Apr, tenant kontrak sampai 31 Jan', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 3, 14),
                input: null,
            },
        ];
        // Bills for Jan only (custom booking end_date: Jan 31)
        const bills = makeBillsForMonths([[2023, 0]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment: should be attached to Jan
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
    });

    it('Scenario 7: Sewa 3 bulan, mulai tgl 1 Jan, selesai 31 Mar, tenant kontrak sampai 31 Jan', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 31),
                input: null,
            },
        ];
        // Bills for Jan only (custom booking end_date: Jan 31)
        const bills = makeBillsForMonths([[2023, 0]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Full payment: should be attached to Jan
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
    });

    it('Scenario 8: Two addons with different date ranges', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 31),
                input: null,
            },
            {
                addon_id: 'addon-2',
                booking_id: booking.id,
                start_date: new Date(2023, 1, 1),
                end_date: new Date(2023, 4, 31),
                input: null,
            },
        ];
        // Bills for Jan, Feb, Mar, Apr, May
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3], [2023, 4]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Internet full payment for Jan-Mar attached to Mar
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
        // Cleaning partials for Feb-May
        expect(billItems[bills[1].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - February 28)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        expect(billItems[bills[2].id]).toEqual(expect.arrayContaining([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (March 1 - March 31)',
                amount: new Prisma.Decimal(50000),
            }),
        ]));
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (April 1 - April 30)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        expect(billItems[bills[4].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (May 1 - May 31)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
    });

    it('Scenario 9: Two addons with overlapping date ranges', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 4, 31),
                input: null,
            },
            {
                addon_id: 'addon-2',
                booking_id: booking.id,
                start_date: new Date(2023, 1, 1),
                end_date: new Date(2023, 4, 31),
                input: null,
            },
        ];

        // Bills for Jan, Feb, Mar, Apr, May
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3], [2023, 4]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);

        // Jan: Internet full payment
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
        // Feb: Cleaning
        expect(billItems[bills[1].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - February 28)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        // Mar: Cleaning
        expect(billItems[bills[2].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (March 1 - March 31)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        // Apr: Internet (partial) + Cleaning
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (April 1 - April 30)',
                amount: new Prisma.Decimal(120000),
            }),
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (April 1 - April 30)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        // May: Internet (partial) + Cleaning
        expect(billItems[bills[4].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (May 1 - May 31)',
                amount: new Prisma.Decimal(120000),
            }),
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (May 1 - May 31)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
    });

    it('Scenario 10: Two addons with overlapping date ranges, tenant checks out early', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 3, 30),
                input: null,
            },
            {
                addon_id: 'addon-2',
                booking_id: booking.id,
                start_date: new Date(2023, 1, 1),
                end_date: new Date(2023, 3, 30),
                input: null,
            },
        ];

        // Bills for Jan, Feb
        const bills = makeBillsForMonths([[2023, 0], [2023, 1]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);

        // Jan: Internet full payment
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(300000),
            })
        ]);
        // Feb: Cleaning (should be for Feb, Mar, Apr)
        expect(billItems[bills[1].id]).toEqual(expect.arrayContaining([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - April 30)',
                amount: new Prisma.Decimal(150000),
            }),

        ]));
    });

    it('Cleaning Addon, start mid month', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-2',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 3, 30),
                input: null,
            },
        ];

        // Bills for Jan, Feb
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2], [2023, 3]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);

        // Jan: Cleaning Pro Rated
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (January 15 - January 31)',
                amount: new Prisma.Decimal(27500),
            })
        ]);
        // Feb: Cleaning
        expect(billItems[bills[1].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - February 28)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        expect(billItems[bills[2].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (March 1 - March 31)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Cleaning) (April 1 - April 30)',
                amount: new Prisma.Decimal(50000),
            })
        ]);
    });

    it('Real Scenario 1', async () => {
        let bookingAddons = [
            {
                "addon_id": "cm56ey0dp000u1slel4rfzuy1",
                "start_date": new Date(2025, 2, 1),
                "end_date": new Date(2025, 7, 31)
            }
        ];

        let addon = {
            "id": "cm56ey0dp000u1slel4rfzuy1",
            "name": "Kulkas",
            "description": "Kulkas",
            "requires_input": false,
            "parent_addon_id": null,
            "location_id": 1,
            "createdAt": "2024-12-27T07:10:20.268Z",
            "updatedAt": "2024-12-27T07:10:20.268Z",
            "pricing": [
                {
                    "id": "cm56ey0dp000v1sle0a8cfq64",
                    "addon_id": "cm56ey0dp000u1slel4rfzuy1",
                    "interval_start": 0,
                    "interval_end": 2,
                    "price": 300000,
                    "is_full_payment": true,
                    "createdAt": "2024-12-27T07:10:20.268Z",
                    "updatedAt": "2024-12-27T07:10:20.268Z"
                },
                {
                    "id": "cm56ey0dp000w1slegfhaatc4",
                    "addon_id": "cm56ey0dp000u1slel4rfzuy1",
                    "interval_start": 3,
                    "interval_end": null,
                    "price": 120000,
                    "is_full_payment": false,
                    "createdAt": "2024-12-27T07:10:20.268Z",
                    "updatedAt": "2024-12-27T07:10:20.268Z"
                }
            ]
        };

        let booking = {
            "room_id": 3,
            "start_date": new Date(2025, 2, 1),
            "duration_id": 3,
            "status_id": 2,
            "tenant_id": "ckabcde12345678901",
            "fee": 3500000,
            "addOns": [
                {
                    "addon_id": "cm56ey0dp000u1slel4rfzuy1",
                    "start_date": "2025-03-01T00:00:00.000Z",
                    "end_date": "2025-08-30T17:00:00.000Z"
                }
            ],
            "end_date": new Date(2025, 7, 31)
        };

        // @ts-expect-error mockResolvedValue error
        prismaMock.addOn.findFirstOrThrow.mockResolvedValue(addon);

        // Bills for Mar, Jun, Jul, Aug
        const bills = makeBillsForMonths([[2025, 2], [2025, 5], [2025, 6], [2025, 7]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);

        // Mar: full payment
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: "Biaya Layanan Tambahan (Kulkas) (March 1 - May 31)",
                amount: new Prisma.Decimal(300000)
            })
        ]);
        // Jun: monthly
        expect(billItems[bills[1].id]).toEqual([
            expect.objectContaining({
                description: "Biaya Layanan Tambahan (Kulkas) (June 1 - June 30)",
                amount: new Prisma.Decimal(120000)
            })
        ]);
        // Jul: monthly
        expect(billItems[bills[2].id]).toEqual([
            expect.objectContaining({
                description: "Biaya Layanan Tambahan (Kulkas) (July 1 - July 31)",
                amount: new Prisma.Decimal(120000)
            })
        ]);
        // Aug: monthly
        expect(billItems[bills[3].id]).toEqual([
            expect.objectContaining({
                description: "Biaya Layanan Tambahan (Kulkas) (August 1 - August 31)",
                amount: new Prisma.Decimal(120000)
            })
        ]);
    });

    it('Real Scenario 2: Add-on starts and ends mid-month, with both full payment and monthly pricing', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-5',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 10), // Jan 10
                end_date: new Date(2023, 2, 20),   // Mar 20
                input: null,
            },
        ];
        // Pricing: full payment for first 2 months, then monthly
        const customAddon = {
            id: 'addon-5',
            name: 'Internet',
            pricing: [
                { interval_start: 0, interval_end: 1, price: 200000, is_full_payment: true },
                { interval_start: 2, interval_end: null, price: 90000 },
            ],
        };
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === 'addon-5') return Promise.resolve(customAddon);
            return Promise.reject(new Error('AddOn not found'));
        });
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Jan: full payment for Jan 10 - Feb 28
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 10 - March 9)',
                amount: new Prisma.Decimal(200000),
            })
        ]);
        // Mar: monthly for Mar 1 - Mar 20
        expect(billItems[bills[2].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (March 10 - March 20)',
                amount: new Prisma.Decimal(32000),
            })
        ]);
        expect(billItems[bills[1].id]).toBeUndefined();
    });

    it('Real Scenario 3: Add-on starts before first bill and ends after last bill', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-5',
                booking_id: booking.id,
                start_date: new Date(2022, 11, 15), // Dec 15, 2022
                end_date: new Date(2023, 3, 10),    // Apr 10, 2023
                input: null,
            },
        ];
        const customAddon = {
            id: 'addon-5',
            name: 'Internet',
            pricing: [
                { interval_start: 0, interval_end: null, price: 100000 },
            ],
        };
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === 'addon-5') return Promise.resolve(customAddon);
            return Promise.reject(new Error('AddOn not found'));
        });
        // Only bills for Jan, Feb, Mar
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        // Should throw because add-on start is before first bill
        await expect(generateBookingAddonsBillItems(bookingAddons, bills)).rejects.toThrow();
    });

    it('Real Scenario 4: Add-on with pricing interval change mid-way, booking ends in middle of second interval', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1), // Jan 1
                end_date: new Date(2023, 2, 15),  // Mar 15
                input: null,
            },
        ];
        const customAddon = {
            id: 'addon-1',
            name: 'Internet',
            pricing: [
                { interval_start: 0, interval_end: 0, price: 150000, is_full_payment: false },
                { interval_start: 1, interval_end: null, price: 80000 },
            ],
        };
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === 'addon-1') return Promise.resolve(customAddon);
            return Promise.reject(new Error('AddOn not found'));
        });
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // Jan: full payment for Jan 1-31
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - January 31)',
                amount: new Prisma.Decimal(150000),
            })
        ]);
        // Feb: monthly for Feb 1-28
        expect(billItems[bills[1].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (February 1 - February 28)',
                amount: new Prisma.Decimal(80000),
            })
        ]);
        // Mar: partial for Mar 1-15
        expect(billItems[bills[2].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (March 1 - March 15)',
                amount: new Prisma.Decimal(38800),
            })
        ]);
    });

    it('Real Scenario 5: Add-on with only one bill available, but covers multiple months', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1), // Jan 1
                end_date: new Date(2023, 2, 31),  // Mar 31
                input: null,
            },
        ];
        const customAddon = {
            id: 'addon-1',
            name: 'Internet',
            pricing: [
                { interval_start: 0, interval_end: null, price: 120000 },
            ],
        };
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === 'addon-1') return Promise.resolve(customAddon);
            return Promise.reject(new Error('AddOn not found'));
        });
        // Only one bill for Jan
        const bills = makeBillsForMonths([[2023, 0]]);
        const billItems = await generateBookingAddonsBillItems(bookingAddons, bills);
        // All merged into Jan bill
        expect(billItems[bills[0].id]).toEqual([
            expect.objectContaining({
                description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                amount: new Prisma.Decimal(120000 * 3),
            })
        ]);
    });

    it('Real Scenario 6: Add-on with a gap in pricing intervals (should throw)', async () => {
        const bookingAddons = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1), // Jan 1
                end_date: new Date(2023, 2, 28),  // Mar 28
                input: null,
            },
        ];
        const customAddon = {
            id: 'addon-1',
            name: 'Internet',
            pricing: [
                { interval_start: 0, interval_end: 0, price: 100000 },
                { interval_start: 2, interval_end: null, price: 90000 },
            ],
        };
        // @ts-expect-error mockImplementation error
        prismaMock.addOn.findFirstOrThrow.mockImplementation(({ where }: { where: { id: string } }) => {
            if (where.id === 'addon-1') return Promise.resolve(customAddon);
            return Promise.reject(new Error('AddOn not found'));
        });
        const bills = makeBillsForMonths([[2023, 0], [2023, 1], [2023, 2]]);
        await expect(generateBookingAddonsBillItems(bookingAddons, bills)).rejects.toThrow();
    });
});


describe("generateRoomBillAndBillItems", () => {
    it("should generate bills and bill items for a full month starting on the 1st", async () => {
        const data = {
            fee: new Prisma.Decimal(300000),
            start_date: new Date(2023, 0, 1), // January 1, 2023
        };
        const duration = {month_count: 3};

        const result = await generateBookingBillandBillItems(data, duration);

        expect(result.billsWithBillItems).toEqual([
            {
                description: expect.stringContaining("Tagihan untuk Bulan January"),
                due_date: new Date(2023, 0, 31), // January 31, 2023
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (January 1-31)",
                                type: BillType.GENERATED
                            }
                        ],
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan February"),
                due_date: new Date(2023, 1, 28), // February 28, 2023
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (February 1-28)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan March"),
                due_date: new Date(2023, 2, 31), // March 31, 2023
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (March 1-31)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
        ]);

        expect(result.billItems).toEqual([
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (January 1-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (February 1-28)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (March 1-31)",
                type: BillType.GENERATED
            },
        ]);

        expect(result.endDate).toEqual(new Date(2023, 2, 31)); // March 31, 2023
    });

    it("should generate prorated bills and bill items if the start date is not the 1st", async () => {
        const data = {
            fee: new Prisma.Decimal(300000),
            second_resident_fee: new Prisma.Decimal(150000),
            start_date: new Date(2023, 0, 15), // January 15, 2023
        };
        const duration = {month_count: 3};

        const result = await generateBookingBillandBillItems(data, duration);

        const proratedAmount = Math.round((300000 / 31) * 17); // 17 days remaining in January
        expect(result.billsWithBillItems).toEqual([
            {
                description: expect.stringContaining("Tagihan untuk Bulan January"),
                due_date: new Date(2023, 0, 31), // January 31, 2023
                bill_item: {
                    createMany: {
                        data: expect.arrayContaining([
                            {
                                amount: new Prisma.Decimal(Math.round(proratedAmount / 2)),
                                description: "Biaya Penghuni Kedua (January 15-31)",
                                type: BillType.GENERATED
                            },
                            {
                                amount: new Prisma.Decimal(proratedAmount),
                                description: "Biaya Sewa Kamar (January 15-31)",
                                type: BillType.GENERATED
                            },
                        ])
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan February"),
                due_date: new Date(2023, 1, 28), // February 28, 2023
                bill_item: {
                    createMany: {
                        data: expect.arrayContaining([
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (February 1-28)",
                                type: BillType.GENERATED
                            },
                            {
                                amount: new Prisma.Decimal(150000),
                                description: "Biaya Penghuni Kedua (February 1-28)",
                                type: BillType.GENERATED
                            }
                        ])
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan March"),
                due_date: new Date(2023, 2, 31), // March 31, 2023
                bill_item: {
                    createMany: {
                        data: expect.arrayContaining([
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (March 1-31)",
                                type: BillType.GENERATED
                            },
                            {
                                amount: new Prisma.Decimal(150000),
                                description: "Biaya Penghuni Kedua (March 1-31)",
                                type: BillType.GENERATED
                            }
                        ])
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan April"),
                due_date: new Date(2023, 3, 30), // April 30, 2023
                bill_item: {
                    createMany: {
                        data: expect.arrayContaining([
                            {
                                amount: new Prisma.Decimal(300000),
                                description: "Biaya Sewa Kamar (April 1-30)",
                                type: BillType.GENERATED
                            },
                            {
                                amount: new Prisma.Decimal(150000),
                                description: "Biaya Penghuni Kedua (April 1-30)",
                                type: BillType.GENERATED
                            }
                        ])
                    }
                }
            },
        ]);

        expect(result.billItems).toEqual(expect.arrayContaining([
            {
                amount: new Prisma.Decimal(proratedAmount),
                description: "Biaya Sewa Kamar (January 15-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (February 1-28)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (March 1-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(300000),
                description: "Biaya Sewa Kamar (April 1-30)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(Math.round(proratedAmount / 2)),
                description: "Biaya Penghuni Kedua (January 15-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(150000),
                description: "Biaya Penghuni Kedua (February 1-28)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(150000),
                description: "Biaya Penghuni Kedua (March 1-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(150000),
                description: "Biaya Penghuni Kedua (April 1-30)",
                type: BillType.GENERATED
            }
        ]));

        expect(result.endDate).toEqual(new Date(2023, 3, 30)); // April 30, 2023
    });

    it("should handle single-month durations correctly", async () => {
        const data = {
            fee: new Prisma.Decimal(250000),
            start_date: new Date(2023, 4, 10), // May 10, 2023
        };
        const duration = {month_count: 1};

        const result = await generateBookingBillandBillItems(data, duration);

        const proratedAmount = Math.round((250000 / 31) * 22); // 22 days remaining in May
        expect(result.billsWithBillItems).toEqual([
            {
                description: expect.stringContaining("Tagihan untuk Bulan May"),
                due_date: new Date(2023, 4, 31), // May 31, 2023
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(proratedAmount),
                                description: "Biaya Sewa Kamar (May 10-31)",
                                type: BillType.GENERATED
                            }
                        ]
                    },
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan June"),
                due_date: new Date(2023, 5, 30), // May 31, 2023
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(data.fee),
                                description: "Biaya Sewa Kamar (June 1-30)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
        ]);

        expect(result.billItems).toEqual([
            {
                amount: new Prisma.Decimal(proratedAmount),
                description: "Biaya Sewa Kamar (May 10-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(data.fee),
                description: "Biaya Sewa Kamar (June 1-30)",
                type: BillType.GENERATED
            },
        ]);

        expect(result.endDate).toEqual(new Date(2023, 5, 30)); // June 30, 2023
    });

    it("should handle durations with no months correctly (edge case)", async () => {
        const data = {
            fee: new Prisma.Decimal(500000),
            start_date: new Date(2023, 6, 1), // July 1, 2023
        };
        const duration = {month_count: 0}; // No months

        const date = new Date();
        const result = await generateBookingBillandBillItems(data, duration);

        expect(result.billsWithBillItems).toEqual([]);
        expect(result.billItems).toEqual([]);
        expect(result.endDate.getFullYear()).toEqual(date.getFullYear());
        expect(result.endDate.getMonth()).toEqual(date.getMonth());
        expect(result.endDate.getDate()).toEqual(date.getDate());
    });

    it("should handle leap years correctly", async () => {
        const data = {
            fee: new Prisma.Decimal(200000),
            start_date: new Date(2024, 1, 20), // February 20, 2024 (Leap Year)
        };
        const duration = {month_count: 2};

        const result = await generateBookingBillandBillItems(data, duration);

        const proratedAmount = Math.round((200000 / 29) * 10); // 10 days remaining in February
        expect(result.billsWithBillItems).toEqual([
            {
                description: expect.stringContaining("Tagihan untuk Bulan February"),
                due_date: new Date(2024, 1, 29), // February 29, 2024
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(proratedAmount),
                                description: "Biaya Sewa Kamar (February 20-29)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan March"),
                due_date: new Date(2024, 2, 31), // March 31, 2024
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(200000),
                                description: "Biaya Sewa Kamar (March 1-31)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
            {
                description: expect.stringContaining("Tagihan untuk Bulan April"),
                due_date: new Date(2024, 3, 30), // April 30, 2024
                bill_item: {
                    createMany: {
                        data: [
                            {
                                amount: new Prisma.Decimal(200000),
                                description: "Biaya Sewa Kamar (April 1-30)",
                                type: BillType.GENERATED
                            },
                        ]
                    }
                }
            },
        ]);

        expect(result.billItems).toEqual([
            {
                amount: new Prisma.Decimal(proratedAmount),
                description: "Biaya Sewa Kamar (February 20-29)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(200000),
                description: "Biaya Sewa Kamar (March 1-31)",
                type: BillType.GENERATED
            },
            {
                amount: new Prisma.Decimal(200000),
                description: "Biaya Sewa Kamar (April 1-30)",
                type: BillType.GENERATED
            },
        ]);

        expect(result.endDate).toEqual(new Date(2024, 3, 30)); // April 30, 2024
    });
});

describe("matchBillItemsToBills", () => {
    it("should correctly match bill items to the closest bills", async () => {
        const billItemsByDueDate = new Map([
            [new Date("2023-01-10"), [{id: 1, description: "Item 1"}, {id: 2, description: "Item 2"}]],
            [new Date("2023-02-15"), [{id: 3, description: "Item 3"}]],
            [new Date("2023-03-20"), [{id: 4, description: "Item 4"}]],
        ]);

        const bills = [
            {id: 101, due_date: new Date("2023-01-10")},
            {id: 102, due_date: new Date("2023-02-01")},
            {id: 103, due_date: new Date("2023-03-25")},
        ];

        // @ts-expect-error TS2345: bill-items incomplete
        const result = await matchBillItemsToBills(billItemsByDueDate, bills);

        expect(result).toEqual(
            new Map([
                [
                    101,
                    [
                        {id: 1, description: "Item 1"},
                        {id: 2, description: "Item 2"},
                    ],
                ],
                [102, [{id: 3, description: "Item 3"}]],
                [103, [{id: 4, description: "Item 4"}]],
            ])
        );
    });

    it("should match items to the closest earlier bill if no exact match exists", async () => {
        const billItemsByDueDate = new Map([
            [new Date("2023-02-10"), [{id: 5, description: "Item 5"}]],
        ]);

        const bills = [
            {id: 201, due_date: new Date("2023-01-31")},
            {id: 202, due_date: new Date("2023-03-01")},
        ];

        // @ts-expect-error TS2345: bill-items incomplete
        const result = await matchBillItemsToBills(billItemsByDueDate, bills);

        expect(result).toEqual(
            new Map([
                [201, [{id: 5, description: "Item 5"}]],
            ])
        );
    });

    it("should match items to the closest earlier bill if no exact match exists 2", async () => {
        const billItemsByDueDate = new Map([
            [new Date("2023-05-10"), [{id: 6, description: "Item 6"}]],
        ]);

        const bills = [
            {id: 301, due_date: new Date("2023-03-01")},
            {id: 302, due_date: new Date("2023-04-01")},
        ];

        // @ts-expect-error TS2345: bill-items incomplete
        const result = await matchBillItemsToBills(billItemsByDueDate, bills);

        expect(result).toEqual(
            new Map([
                [302, [{id: 6, description: "Item 6"}]],
            ])
        );
    });

    it("should handle an empty list of bills", async () => {
        const billItemsByDueDate = new Map([
            [new Date("2023-02-10"), [{id: 7, description: "Item 7"}]],
        ]);

        const bills: { id: number; due_date: Date }[] = [];

        // @ts-expect-error TS2345: bill-items incomplete
        const result = await matchBillItemsToBills(billItemsByDueDate, bills);

        expect(result).toEqual(new Map());
    });

    it("should handle an empty map of bill items", async () => {
        const billItemsByDueDate = new Map();
        const bills = [
            {id: 401, due_date: new Date("2023-01-01")},
            {id: 402, due_date: new Date("2023-02-01")},
        ];

        const result = await matchBillItemsToBills(billItemsByDueDate, bills);

        expect(result).toEqual(new Map());
    });
});
