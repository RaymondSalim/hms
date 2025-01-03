import {beforeEach, describe, expect, it, test} from "@jest/globals";
import {prismaMock} from "./singleton_prisma";
import {
    generateBillItemsFromBookingAddons,
    generatePaymentBillMappingFromPaymentsAndBills,
    getUnpaidBillsDueAction,
    simulateUnpaidBillPaymentAction
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {AddOnPricing, Bill, Booking, BookingAddOn, Payment, Prisma} from "@prisma/client";
import {BillIncludePayment} from "@/app/_db/bills";
import {OmitIDTypeAndTimestamp, OmitTimestamp} from "@/app/_db/db";

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

describe('generateBillItemsFromBookingAddons', () => {
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

    it('Scenario 1: Sewa 3 bulan, mulai tgl 1 Jan, selesai 31 Mar', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 31),
                input: null,
            },
        ];

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 2: Sewa 3 bulan, mulai tgl 15 Jan, selesai 14 Apr', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 3, 14),
                input: null,
            },
        ];

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 3: Sewa 5 bulan, mulai tgl 1 Jan, selesai 31 May', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 4, 31),
                input: null,
            },
        ];

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-3',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (April 1 - April 30)',
                        amount: new Prisma.Decimal(120000),
                    },
                ],
            ],
            [
                '2023-4',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (May 1 - May 31)',
                        amount: new Prisma.Decimal(120000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 4: Sewa 5 bulan, mulai tgl 15 Jan, selesai 14 June', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 5, 14),
                input: null,
            },
        ];

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-3',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (April 15 - April 30)',
                        amount: new Prisma.Decimal(64000),
                    },
                ],
            ],
            [
                '2023-4',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (May 1 - May 31)',
                        amount: new Prisma.Decimal(120000),
                    },
                ],
            ],
            [
                '2023-5',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (June 1 - June 14)',
                        amount: new Prisma.Decimal(56000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 5: Sewa 5 bulan, mulai tgl 15 Jan, selesai 14 June, tenant kontrak sampai 31 May', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 5, 14),
                input: null,
            },
        ];

        const customBooking = {
            id: 123,
            end_date: new Date(2023, 4, 31),
        };

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, customBooking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-3',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (April 15 - April 30)',
                        amount: new Prisma.Decimal(64000),
                    },
                ],
            ],
            [
                '2023-4',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (May 1 - June 14)',
                        amount: new Prisma.Decimal(176000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 6: Sewa 3 bulan, mulai tgl 15 Jan, selesai 14 Apr, tenant kontrak sampai 31 Jan', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 15),
                end_date: new Date(2023, 3, 14),
                input: null,
            },
        ];

        const customBooking = {
            id: 123,
            end_date: new Date(2023, 0, 31),
        };

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, customBooking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 15 - April 14)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 7: Sewa 3 bulan, mulai tgl 1 Jan, selesai 31 Mar, tenant kontrak sampai 31 Jan', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 31),
                input: null,
            },
        ];

        const customBooking = {
            id: 123,
            end_date: new Date(2023, 0, 31),
        };

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, customBooking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 8: Two addons with different date ranges', async () => {
        const bookingAddons: OmitIDTypeAndTimestamp<BookingAddOn>[] = [
            {
                addon_id: 'addon-1',
                booking_id: booking.id,
                start_date: new Date(2023, 0, 1),
                end_date: new Date(2023, 2, 28),
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

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-1',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - February 28)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-2',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (March 1 - March 31)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-3',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (April 1 - April 30)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-4',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (May 1 - May 31)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
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

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-1',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - February 28)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-2',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (March 1 - March 31)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-3',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (April 1 - April 30)',
                        amount: new Prisma.Decimal(120000),
                    },
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (April 1 - April 30)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
            [
                '2023-4',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (May 1 - May 31)',
                        amount: new Prisma.Decimal(120000),
                    },
                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (May 1 - May 31)',
                        amount: new Prisma.Decimal(50000),
                    },
                ],
            ],
        ]);
    });

    it('Scenario 10: Two addons with overlapping date ranges, tenant checks out early', async () => {
        const customBooking = {
            id: 123,
            end_date: new Date(2023, 1, 28),
        };

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

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, customBooking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                '2023-0',
                [
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (January 1 - March 31)',
                        amount: new Prisma.Decimal(300000),
                    },
                ],
            ],
            [
                '2023-1',
                [

                    {
                        description: 'Biaya Layanan Tambahan (Cleaning) (February 1 - April 30)',
                        amount: new Prisma.Decimal(150000),
                    },
                    {
                        description: 'Biaya Layanan Tambahan (Internet) (April 1 - April 30)',
                        amount: new Prisma.Decimal(120000),
                    },
                ],
            ],
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

        // @ts-expect-error booking addon type
        const billItems = await generateBillItemsFromBookingAddons(bookingAddons, booking);

        expect(Array.from(billItems.entries())).toEqual([
            [
                "2025-2",
                [
                    {
                        description: "Biaya Layanan Tambahan (Kulkas) (March 1 - May 31)",
                        amount: new Prisma.Decimal(300000)
                    }
                ]
            ],
            [
                "2025-5",
                [
                    {
                        description: "Biaya Layanan Tambahan (Kulkas) (June 1 - June 30)",
                        amount: new Prisma.Decimal(120000)
                    }
                ]
            ],
            [
                "2025-6",
                [
                    {
                        description: "Biaya Layanan Tambahan (Kulkas) (July 1 - July 31)",
                        amount: new Prisma.Decimal(120000)
                    }
                ]
            ],
            [
                "2025-7",
                [
                    {
                        description: "Biaya Layanan Tambahan (Kulkas) (August 1 - August 31)",
                        amount: new Prisma.Decimal(120000)
                    }
                ]
            ]
        ]);
    });
});