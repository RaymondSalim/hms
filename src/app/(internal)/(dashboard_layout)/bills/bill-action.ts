"use server";

import prisma from "@/app/_lib/primsa";
import {Bill, BillType, Booking, BookingAddOn, Duration, Payment, PaymentBill, Prisma} from "@prisma/client";
import {
    BillIncludeAll,
    billIncludeAll,
    BillIncludeBillItem,
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
import {UpsertBookingPayload} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import BillUncheckedCreateInput = Prisma.BillUncheckedCreateInput;
import BillItemUncheckedCreateInput = Prisma.BillItemUncheckedCreateInput;

/**
 * Type definition for bills that include payment information and sum of paid amounts
 */
export type BillIncludePaymentAndSum = BillIncludePayment & {
    sumPaidAmount: Prisma.Decimal
};

/**
 * Retrieves unpaid bills for a booking, ordered by due date
 * @param booking_id - The booking ID to get unpaid bills for
 * @param args - Additional Prisma query arguments
 * @returns Object containing total due amount and array of unpaid bills
 */
export async function getUnpaidBillsDueAction(booking_id?: number, args?: Prisma.BillFindManyArgs): Promise<{
    total?: number,
    bills: BillIncludeAll[]
}> {
    const bills = await getBillsWithPayments(booking_id, {
        ...args,
        orderBy: {
            due_date: "asc"
        },
        include: {
            ...args?.include,
            bill_item: true
        }
    });

    let totalDue = new Prisma.Decimal(0);

    // Only get unpaid bills and also add a new field "sumPaidAmount"
    // @ts-expect-error missing rooms
    const unpaidBills: BillIncludeAll[] = bills
        .map(b => {
            const currBillAmount = b.bill_item.reduce(
                (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
            );
            totalDue = totalDue.add(currBillAmount);
            const paidAmount = b.paymentBills.reduce((acc, b) => {
                return acc.add(b.amount);
            }, new Prisma.Decimal(0));

            return {
                ...b,
                amount: currBillAmount,
                sumPaidAmount: paidAmount
            };
        })
        .filter(b => !b.sumPaidAmount.equals(b.amount));

    return {
        total: totalDue.toNumber(),
        bills: unpaidBills
    };
}

/**
 * Simulates how a payment amount would be allocated across unpaid bills
 * @param balance - The payment amount to allocate
 * @param filteredBills - Array of bills with payment information
 * @param payment_id - Optional payment ID for the simulation
 * @returns Simulation result with old and new state
 */
export async function simulateUnpaidBillPaymentAction(balance: number, filteredBills: BillIncludePaymentAndSum[], payment_id?: number) {
    const originalBalance = balance;

    // Ensure bookings is sorted by ascending order
    filteredBills.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());

    const paymentBills: OmitIDTypeAndTimestamp<PaymentBill>[] = [];

    for (let i = 0; i < filteredBills.length; i++) {
        let currBills = filteredBills[i];
        let billAmount = currBills.bill_item.reduce(
            (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
        );
        let outstanding = new Prisma.Decimal(billAmount);

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

/**
 * Simulates payment allocation while excluding a specific payment from calculations
 * Used when editing a payment to show correct allocation without double-counting
 * @param balance - The payment amount to allocate
 * @param booking_id - The booking ID to get bills for
 * @param excludePaymentId - The payment ID to exclude from calculations
 * @returns Simulation result with old and new state
 */
export async function simulateUnpaidBillPaymentActionWithExcludePayment(balance: number, booking_id: number, excludePaymentId: number) {
    // Get all bills with payments (not just unpaid ones)
    const bills = await getBillsWithPayments(booking_id, {
        orderBy: {
            due_date: "asc"
        },
        include: {
            bill_item: true,
            paymentBills: true
        }
    });

    // For each bill, recalculate sumPaidAmount excluding the specified payment
    const billsWithRecalculatedPayments = bills
        .map(b => {
            const currBillAmount = b.bill_item.reduce(
                (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
            );
            const filteredPaymentBills = b.paymentBills.filter(pb => pb.payment_id !== excludePaymentId);
            const paidAmount = filteredPaymentBills.reduce((acc, pb) => acc.add(pb.amount), new Prisma.Decimal(0));
            return {
                ...b,
                paymentBills: filteredPaymentBills, // Filter the paymentBills array itself
                amount: currBillAmount,
                sumPaidAmount: paidAmount
            };
        });

    // Run the simulation as usual - let it handle which bills get allocated to
    return simulateUnpaidBillPaymentAction(balance, billsWithRecalculatedPayments, excludePaymentId);
}

/**
 * Generates payment-bill mappings from a list of payments and bills
 * @param payments - Array of payments to allocate
 * @param bills - Array of bills to allocate payments to
 * @returns Array of payment-bill mappings
 */
export async function generatePaymentBillMappingFromPaymentsAndBills(payments: OmitTimestamp<Payment>[], bills: OmitTimestamp<BillIncludeBillItem>[]): Promise<OmitIDTypeAndTimestamp<PaymentBill>[]> {
    const paymentBills: OmitIDTypeAndTimestamp<PaymentBill>[] = [];

    if (bills.length == 0 || payments.length == 0) {
        return paymentBills;
    }

    const billsCopy = bills.map(bill => ({...bill}));

    billsCopy.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
    payments.sort((a, b) => a.payment_date.getTime() - b.payment_date.getTime());

    let billIndex = 0;
    let paid = new Prisma.Decimal(0);

    for (const currPayment of payments) {
        let balance = currPayment.amount;

        while (balance.gt(0) && billIndex < billsCopy.length) {
            const currBill = billsCopy[billIndex];

            const currBillAmount = currBill.bill_item.reduce(
                (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
            ).minus(paid);

            if (currBillAmount.lte(balance)) {
                // Full payment of the bill
                balance = balance.minus(currBillAmount);
                paymentBills.push({
                    payment_id: currPayment.id,
                    bill_id: currBill.id,
                    amount: currBillAmount
                });
                paid = new Prisma.Decimal(0);
                billIndex++;
            } else {
                // Partial payment of the bill
                paymentBills.push({
                    payment_id: currPayment.id,
                    bill_id: currBill.id,
                    amount: balance
                });
                paid = paid.plus(new Prisma.Decimal(balance));
                balance = new Prisma.Decimal(0);
                break;
            }
        }
    }

    return paymentBills;
}

/**
 * Creates payment-bill records for a given payment amount and bills
 * @param balance - The payment amount to allocate
 * @param bills - Array of bills with payment information
 * @param payment_id - The payment ID to create records for
 * @param trx - Optional transaction client
 * @returns Object containing remaining balance and created records
 */
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

/**
 * Retrieves all bills with full booking information for a location
 * @param id - Optional bill ID filter
 * @param locationID - Location ID to filter bills by
 * @param limit - Maximum number of bills to return
 * @param offset - Number of bills to skip
 * @returns Array of bills with full booking information
 */
export async function getAllBillsIncludeAll(id?: number, locationID?: number, limit?: number, offset?: number) {
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
                },
                bill_item: true
            },
            take: limit,
            skip: offset,
        }
    );
}

/**
 * Retrieves all bills with booking and payment information for a location
 * @param id - Optional bill ID filter
 * @param locationID - Location ID to filter bills by
 * @param limit - Maximum number of bills to return
 * @param offset - Number of bills to skip
 * @returns Array of bills with booking and payment information
 */
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

/**
 * Creates or updates a bill
 * @param billData - Bill data to create or update
 * @returns Success response with bill data or error information
 */
export async function upsertBillAction(billData: PartialBy<OmitTimestamp<Bill>, "id">) {
    const {success, data, error} = billSchemaWithOptionalID.safeParse(billData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    let parsedBillData: PartialBy<OmitTimestamp<Bill>, "id"> = {
        ...data,
        description: data?.description ?? "",
    };

    try {
        let res;
        // Update
        if (data?.id) {
            res = await prisma.$transaction(async (tx) => {
                // @ts-ignore type error due to internal_description
                let updated = await updateBillByID(data.id!, parsedBillData);
                await syncBillsWithPaymentDate(data.booking_id, tx);
                return tx.bill.findFirst({
                    where: {id: data.id!},
                    include: billIncludeAll.include
                });
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

/**
 * Deletes a bill by ID
 * @param id - The bill ID to delete
 * @returns Success response with deleted bill data or error information
 */
export async function deleteBillAction(id: number) {
    const {success, error, data} = object({id: number().positive()}).safeParse({
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

/**
 * Synchronizes payment-bill records for a booking based on payment dates
 * Recalculates all payment allocations for the booking
 * @param bookingID - The booking ID to sync payments for
 * @param trx - Transaction client
 * @param newPayments - Optional array of new payments to include in sync
 */
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
            },
            bill_item: true,
        }
    });
    let paymentBillsID = bills.flatMap((b) => b.paymentBills.map(pb => pb.id));
    let allPayments: Payment[] = bills.flatMap(b => b.paymentBills.map(pb => pb.payment));
    allPayments = allPayments.concat(newPayments ?? []);
    // Remove dups
    allPayments = allPayments.filter((item, index, self) =>
            item != undefined && index === self.findIndex((t) => (
                t?.id === item.id
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

/**
 * Retrieves upcoming unpaid bills with user information for a specific date range
 * @param targetDate - The target date to get bills for
 * @param limit - Maximum number of bills to return
 * @param offset - Number of bills to skip
 * @returns Object containing bills and total count
 */
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
            },
            bill_item: true
        },
        skip: offset,
        take: limit
    });

    return {
        ...bills,
        total: await prisma.bill.count({
            where: where,
        })
    };
}

/**
 * Sends a bill reminder email to the tenant
 * @param billID - The bill ID to send reminder for
 * @returns Success or failure response
 */
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
            },
            bill_item: true,
        }
    });

    if (!billData) {
        return {
            failure: "Bill Not Found"
        };
    }

    const tenant = billData.bookings.tenants!;
    const currBillAmount = billData.bill_item.reduce(
        (acc, bi) => acc.add(bi.amount), new Prisma.Decimal(0)
    );

    try {
        const template = await withTemplate(
            EMAIL_TEMPLATES.BILL_REMINDER,
            tenant.name,
            billData.id.toString(),
            formatToIDR(currBillAmount.toNumber()),
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

/**
 * Generates bill items from booking add-ons
 * @param bookingAddons - Array of booking add-ons
 * @param booking - Booking information with end date
 * @returns Map of bill items grouped by month
 */
export async function generateBillItemsFromBookingAddons(
    bookingAddons: BookingAddOn[],
    booking: Pick<Booking, "end_date">
): Promise<Map<string, PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[]>> {
    const billItemsByMonth: Map<string, PartialBy<(Prisma.BillItemUncheckedCreateInput & {
        effectiveEndDate?: Date
        addonID: string
        isBacktracked?: boolean
    }), "bill_id">[]> = new Map();

    for (const bookingAddon of bookingAddons) {
        const addon = await prisma.addOn.findFirstOrThrow({
            where: {id: bookingAddon.addon_id},
            include: {pricing: true},
        });

        const addonPricing = addon.pricing.sort((a, b) => a.interval_start - b.interval_start);
        if (!addonPricing || addonPricing.length === 0) {
            throw new Error(`No pricing available for AddOn with ID ${bookingAddon.addon_id}`);
        }

        const addonStartDate = new Date(bookingAddon.start_date);
        const addonEndDate = new Date(bookingAddon.end_date);

        const totalMonths = Math.ceil(
            (addonEndDate.getFullYear() - addonStartDate.getFullYear()) * 12 +
            addonEndDate.getMonth() -
            addonStartDate.getMonth() +
            1
        );

        // Initialize empty arrays for each month
        for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
            const monthKey = `${addonStartDate.getFullYear()}-${addonStartDate.getMonth() + monthIndex}`;

            if (!billItemsByMonth.has(monthKey)) {
                billItemsByMonth.set(monthKey, []);
            }
        }

        let currentStart = addonStartDate;
        let fullPaymentStart: Date | null = null;
        let fullPaymentAmount = 0;

        while (currentStart <= addonEndDate) {
            const applicablePricing = addonPricing.find(
                (pricing) =>
                    pricing.interval_start <=
                    Math.ceil(
                        (currentStart.getFullYear() - addonStartDate.getFullYear()) * 12 +
                        currentStart.getMonth() -
                        addonStartDate.getMonth() // no +1 as addonPricing is 0-indexed
                    ) &&
                    (!pricing.interval_end ||
                        pricing.interval_end >=
                        Math.ceil(
                            (currentStart.getFullYear() - addonStartDate.getFullYear()) * 12 +
                            currentStart.getMonth() -
                            addonStartDate.getMonth() // no +1 as addonPricing is 0-indexed
                        ))
            );

            if (!applicablePricing) {
                throw new Error(`No pricing found for AddOn ${bookingAddon.addon_id}`);
            }

            const isFullPayment = !!applicablePricing.is_full_payment;
            if (isFullPayment) {
                if (!fullPaymentStart) {
                    fullPaymentStart = currentStart;
                }

                let fullPaymentDurationMonth = (
                    applicablePricing.interval_end
                        ? (applicablePricing.interval_end - applicablePricing.interval_start)
                        : 0) + 1;
                let fullPaymentEndDate = new Date(
                    fullPaymentStart.getFullYear(),
                    fullPaymentStart.getMonth() + fullPaymentDurationMonth,
                    0
                );

                if (fullPaymentEndDate > addonEndDate) {
                    fullPaymentEndDate = addonEndDate;
                }

                const fullPaymentDailyRate = Number(applicablePricing.price) / fullPaymentDurationMonth / 30;
                const fullPaymentDays = Math.ceil(
                    (fullPaymentEndDate.getTime() - fullPaymentStart.getTime()) / (1000 * 60 * 60 * 24)
                );
                fullPaymentAmount = fullPaymentDailyRate * fullPaymentDays;

                const monthKey = `${fullPaymentStart.getFullYear()}-${fullPaymentStart.getMonth()}`;
                const monthItems = billItemsByMonth.get(monthKey)!;

                monthItems.push({
                    amount: new Prisma.Decimal(Math.round(fullPaymentAmount)),
                    description: `Biaya Layanan Tambahan (${addon.name}) (${fullPaymentStart.toLocaleString('default', {month: 'long'})} ${fullPaymentStart.getDate()}-${fullPaymentEndDate.getDate()})`,
                    type: BillType.GENERATED,
                    effectiveEndDate: fullPaymentEndDate,
                    addonID: addon.id,
                    isBacktracked: false
                });

                currentStart = new Date(fullPaymentEndDate.getTime() + 24 * 60 * 60 * 1000);
                fullPaymentStart = null;
                fullPaymentAmount = 0;
            } else {
                const currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);
                const actualEnd = currentEnd > addonEndDate ? addonEndDate : currentEnd;

                const dailyRate = Number(applicablePricing.price) / 30;
                const days = Math.ceil(
                    (actualEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)
                );
                const amount = dailyRate * days;

                const monthKey = `${currentStart.getFullYear()}-${currentStart.getMonth()}`;
                const monthItems = billItemsByMonth.get(monthKey)!;

                monthItems.push({
                    amount: new Prisma.Decimal(Math.round(amount)),
                    description: `Biaya Layanan Tambahan (${addon.name}) (${currentStart.toLocaleString('default', {month: 'long'})} ${currentStart.getDate()}-${actualEnd.getDate()})`,
                    type: BillType.GENERATED,
                    effectiveEndDate: actualEnd,
                    addonID: addon.id,
                    isBacktracked: false
                });

                currentStart = new Date(actualEnd.getTime() + 24 * 60 * 60 * 1000);
            }
        }

        // Merge items in the same month with the same addon
        const entries = Array.from(billItemsByMonth.entries());
        for (const [month, monthItems] of entries) {
            const prevMonthItems: typeof monthItems = [];

            for (let i = 0; i < monthItems.length; i++) {
                const item = monthItems[i];
                const previousItem = prevMonthItems.find((prev: any) => prev.addonID === item.addonID);

                if (previousItem) {
                    previousItem.amount = new Prisma.Decimal(
                        parseFloat(previousItem.amount.toString()) + parseFloat(item.amount.toString())
                    );

                    const previousDescriptionMatch = previousItem.description.match(
                        /\((\w+)\) \((\w+)(\s+)(\d+)(\s*)-\s?(\D*)\s?(\d*)\)/
                    );

                    const currentDescriptionMatch = item.description.match(
                        /\((\w+)(\s+)(\d+)(\s*)-\s?(\w*)\s?(\d*)\)/
                    );

                    if (previousDescriptionMatch && currentDescriptionMatch) {
                        let [, addonName, startMonth, , startDate] = previousDescriptionMatch;
                        let [, currentStartMonth, , currentStartDate, , currentEndMonth, currentEndDate] = currentDescriptionMatch;

                        if (item.isBacktracked) {
                            previousItem.description = `Biaya Layanan Tambahan (${addonName}) (${startMonth} ${startDate} - ${currentEndMonth} ${currentEndDate})`;
                        } else {
                            previousItem.description = `Biaya Layanan Tambahan (${addonName}) (${startMonth} ${startDate} - ${currentStartMonth} ${currentEndDate})`;
                        }
                    }
                } else {
                    if (item.effectiveEndDate) {
                        item.effectiveEndDate = new Date(item.effectiveEndDate.getFullYear(), item.effectiveEndDate.getMonth() - 1, 1);
                    }
                    prevMonthItems.push(item);
                }
                monthItems.splice(i, 1); // Remove the adjusted item
                i--;
            }

            if (monthItems.length == 0) {
                billItemsByMonth.delete(month);
            }
        }
    }

    return new Map(
        Array.from(billItemsByMonth.entries()).map(([month, monthItems]) => [
            month,
            monthItems.map(({effectiveEndDate, addonID, isBacktracked, ...item}) => item) // Remove temporary field
        ])
    );
}

/**
 * Generates bills and bill items for a booking based on fee and duration
 * @param data - Booking data containing fee, start date, and optional second resident fee
 * @param duration - Duration information with month count
 * @returns Object containing bills with bill items, individual bill items, and end date
 */
export async function generateBookingBillandBillItems(
    data: PartialBy<Pick<UpsertBookingPayload, "fee" | "start_date" | "second_resident_fee">, "second_resident_fee">,
    duration: Pick<Duration, "month_count">
) {
    const fee = data.fee;
    const startDate = new Date(data.start_date);
    let endDate = new Date();

    const bills: PartialBy<BillUncheckedCreateInput, "id" | "booking_id">[] = [];
    let billItems: PartialBy<BillItemUncheckedCreateInput, "bill_id">[] = [];

    if (duration.month_count) {
        const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

        // Calculate prorated amount if start_date is not the first of the month
        if (startDate.getDate() !== 1) {
            const remainingDays = totalDaysInMonth - startDate.getDate() + 1;
            const dailyRate = Number(fee) / totalDaysInMonth;
            const proratedAmount = dailyRate * remainingDays;

            let bi = [];
            let billItemDate = `(${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth})`;
            bi.push({
                amount: new Prisma.Decimal(Math.round(proratedAmount)),
                description: `Biaya Sewa Kamar ${billItemDate}`,
                type: BillType.GENERATED
            });
            if (data.second_resident_fee) {
                const dailyRate = Number(data.second_resident_fee) / totalDaysInMonth;
                const proratedAmount = dailyRate * remainingDays;
                bi.push({
                    amount: new Prisma.Decimal(Math.round(proratedAmount)),
                    description: `Biaya Penghuni Kedua ${billItemDate}`,
                    type: BillType.GENERATED
                });
            }
            billItems = billItems.concat(bi);

            bills.push({
                description: `Tagihan untuk Bulan ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth, startDate.getHours()),
                bill_item: {
                    createMany: {
                        data: bi
                    }
                },
            });


            // Add full monthly bills for subsequent months, except the last one
            for (let i = 1; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());

                let bi = [];
                let billItemDate = `(${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`;

                bi.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar ${billItemDate}`,
                    type: BillType.GENERATED
                });
                if (data.second_resident_fee) {
                    bi.push({
                        amount: data.second_resident_fee,
                        description: `Biaya Penghuni Kedua ${billItemDate}`,
                        type: BillType.GENERATED
                    });
                }
                billItems = billItems.concat(bi);

                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    due_date: billEndDate,
                    bill_item: {
                        createMany: {
                            data: bi
                        }
                    },
                });
            }

            // Add full monthly bill for the last month
            const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 1, startDate.getHours());
            const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0, startDate.getHours());

            bi = [];
            billItemDate = `(${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()})`;
            bi.push({
                amount: new Prisma.Decimal(fee),
                description: `Biaya Sewa Kamar ${billItemDate}`,
                type: BillType.GENERATED
            });
            if (data.second_resident_fee) {
                bi.push({
                    amount: data.second_resident_fee,
                    description: `Biaya Penghuni Kedua ${billItemDate}`,
                    type: BillType.GENERATED
                });
            }
            billItems = billItems.concat(bi);

            bills.push({
                description: `Tagihan untuk Bulan ${lastMonthStartDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                due_date: lastMonthEndDate,
                bill_item: {
                    createMany: {
                        data: bi
                    }
                },
            });
            endDate = lastMonthEndDate;

        } else {
            // Add full monthly bills for totalMonths
            for (let i = 0; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());

                let bi = [];
                let billItemDate = `(${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`;
                bi.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar ${billItemDate}`,
                    type: BillType.GENERATED
                });
                if (data.second_resident_fee) {
                    bi.push({
                        amount: data.second_resident_fee,
                        description: `Biaya Penghuni Kedua ${billItemDate}`,
                        type: BillType.GENERATED
                    });
                }
                billItems = billItems.concat(bi);

                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    due_date: billEndDate,
                    bill_item: {
                        createMany: {
                            data: bi
                        }
                    },
                });

                endDate = billEndDate;
            }
        }
    }

    return {
        billsWithBillItems: bills,
        billItems,
        endDate
    };
}
