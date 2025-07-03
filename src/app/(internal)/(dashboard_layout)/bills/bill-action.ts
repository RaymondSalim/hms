"use server";

import prisma from "@/app/_lib/primsa";
import {AddOn, Bill, BillType, BookingAddOn, Duration, Payment, PaymentBill, Prisma} from "@prisma/client";
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

// /**
//  * New implementation of generateBookingAddonsBillItems using TDD outline
//  */
// export async function generateBookingAddonsBillItems(
//     bookingAddons: Pick<BookingAddOn, 'addon_id' | 'start_date' | 'end_date'>[],
//     bills: { id: number, due_date: Date }[]
// ): Promise<{ [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] }> {
//     function findBillIdForDate(date: Date): number | undefined {
//         const y = date.getFullYear();
//         const m = date.getMonth();
//         const bill = bills.find(b => b.due_date.getFullYear() === y && b.due_date.getMonth() === m);
//         return bill?.id;
//     }
//
//     const billItemsByBillId: { [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] } = {};
//
//     for (const bookingAddon of bookingAddons) {
//         const addon = await prisma.addOn.findFirstOrThrow({
//             where: {id: bookingAddon.addon_id},
//             include: {pricing: true},
//         });
//         const pricing = addon.pricing.slice().sort((a, b) => a.interval_start - b.interval_start);
//         if (!pricing.length) throw new Error(`No pricing for AddOn ${bookingAddon.addon_id}`);
//         for (let i = 1; i < pricing.length; ++i) {
//             const prev = pricing[i - 1];
//             const curr = pricing[i];
//             if ((prev.interval_end == null) || (curr.interval_start !== prev.interval_end + 1)) {
//                 throw new Error(`Gap in pricing intervals for AddOn ${bookingAddon.addon_id}`);
//             }
//         }
//         const addonStart = new Date(bookingAddon.start_date);
//         const addonEnd = new Date(bookingAddon.end_date);
//         if (
//             bills.length === 0 ||
//             addonStart.getFullYear() < bills[0].due_date.getFullYear() ||
//             (addonStart.getFullYear() === bills[0].due_date.getFullYear() && addonStart.getMonth() < bills[0].due_date.getMonth())
//         ) {
//             throw new Error(`AddOn start date (${addonStart.toISOString()}) is before the first bill's month (${bills[0]?.due_date?.toISOString?.()})`);
//         }
//         let current = new Date(addonStart);
//         let monthOffset = 0;
//         const lastBill = bills[bills.length - 1];
//         const lastBillMonth = lastBill.due_date.getMonth();
//         const lastBillYear = lastBill.due_date.getFullYear();
//         while (current <= addonEnd) {
//             const p = pricing.find(
//                 (pr) => pr.interval_start <= monthOffset && (pr.interval_end == null || pr.interval_end >= monthOffset)
//             );
//             if (!p) throw new Error(`No pricing found for AddOn ${bookingAddon.addon_id} at month offset ${monthOffset}`);
//             let intervalStart = new Date(current);
//             let intervalEnd: Date;
//             if (p.interval_end != null) {
//                 // Calculate the last day of the last month in the interval, relative to current
//                 const intervalEndMonth = current.getMonth() + (p.interval_end - p.interval_start);
//                 const intervalEndYear = current.getFullYear() + Math.floor((current.getMonth() + (p.interval_end - p.interval_start)) / 12);
//                 const lastDay = new Date(intervalEndYear, intervalEndMonth + 1, 0).getDate();
//                 intervalEnd = new Date(intervalEndYear, intervalEndMonth, lastDay);
//             } else {
//                 intervalEnd = new Date(addonEnd);
//             }
//             if (intervalEnd > addonEnd) intervalEnd = new Date(addonEnd);
//             if (
//                 current.getFullYear() > lastBillYear ||
//                 (current.getFullYear() === lastBillYear && current.getMonth() > lastBillMonth)
//             ) {
//                 break;
//             }
//             let isBacktrack = false;
//             let backtrackEndDate = null;
//             if (
//                 (addonEnd.getFullYear() > lastBillYear ||
//                     (addonEnd.getFullYear() === lastBillYear && addonEnd.getMonth() > lastBillMonth)) &&
//                 (current.getFullYear() === lastBillYear && current.getMonth() === lastBillMonth)
//             ) {
//                 isBacktrack = true;
//                 backtrackEndDate = new Date(addonEnd);
//             }
//             if (p.is_full_payment) {
//                 // For full payment, calculate interval end as the minimum of:
//                 // - the add-on end date
//                 // - the date that is (interval length in months after the current start date, minus one day)
//                 let descEnd: Date;
//                 if (p.interval_end != null) {
//                     // Calculate the interval length in months
//                     const intervalLength = (p.interval_end - p.interval_start) + 1;
//                     // Add intervalLength months to the current date, then subtract one day
//                     let intervalEnd = new Date(current);
//                     intervalEnd.setMonth(intervalEnd.getMonth() + intervalLength);
//                     intervalEnd.setDate(intervalEnd.getDate() - 1);
//                     // If subtracting a day goes to previous month, fix it
//                     if (intervalEnd.getDate() === 0) {
//                         intervalEnd.setMonth(intervalEnd.getMonth(), 0);
//                     }
//                     descEnd = intervalEnd > addonEnd ? addonEnd : intervalEnd;
//                 } else {
//                     descEnd = addonEnd;
//                 }
//                 if (isBacktrack) descEnd = backtrackEndDate!;
//                 let billId: number | undefined;
//                 let description: string;
//                 if (isBacktrack) {
//                     billId = lastBill.id;
//                     description = `Biaya Layanan Tambahan (${addon.name}) (${intervalStart.toLocaleString('default', {month: 'long'})} ${intervalStart.getDate()} - ${descEnd.toLocaleString('default', {month: 'long'})} ${descEnd.getDate()})`;
//                 } else {
//                     // Always assign to the bill for the month of the add-on's start date
//                     billId = findBillIdForDate(addonStart);
//                     description = `Biaya Layanan Tambahan (${addon.name}) (${intervalStart.toLocaleString('default', {month: 'long'})} ${intervalStart.getDate()} - ${descEnd.toLocaleString('default', {month: 'long'})} ${descEnd.getDate()})`;
//                 }
//                 if (billId) {
//                     if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                     billItemsByBillId[billId].push({
//                         amount: new Prisma.Decimal(Math.round(Number(p.price))),
//                         description,
//                     });
//                 }
//                 // If the description's end date is the add-on's end date, stop after this bill item
//                 if (descEnd.getTime() === addonEnd.getTime()) {
//                     break;
//                 }
//                 // Move current to the day after descEnd for the next interval
//                 current = new Date(descEnd);
//                 current.setDate(current.getDate() + 1);
//                 monthOffset = (current.getFullYear() - addonStart.getFullYear()) * 12 + current.getMonth() - addonStart.getMonth();
//                 // If the next interval's start date is after the last bill's month, merge the remaining period into the last bill
//                 if (
//                     (current.getFullYear() > lastBillYear ||
//                         (current.getFullYear() === lastBillYear && current.getMonth() > lastBillMonth)) &&
//                     current <= addonEnd
//                 ) {
//                     let billId = lastBill.id;
//                     let mergeStart = new Date(current);
//                     let mergeEnd = new Date(addonEnd);
//                     let totalAmount = 0;
//                     let tempStart = new Date(mergeStart);
//                     while (tempStart <= mergeEnd) {
//                         let tempEnd = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0);
//                         if (tempEnd > mergeEnd) tempEnd = new Date(mergeEnd);
//                         const daysInMonth = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0).getDate();
//                         const daysUsed = tempEnd.getDate() - tempStart.getDate() + 1;
//                         totalAmount += (Number(p.price) / daysInMonth) * daysUsed;
//                         tempStart = new Date(tempEnd.getFullYear(), tempEnd.getMonth(), tempEnd.getDate() + 1);
//                     }
//                     let amount = Math.round(totalAmount);
//                     let description = `Biaya Layanan Tambahan (${addon.name}) (${mergeStart.toLocaleString('default', {month: 'long'})} ${mergeStart.getDate()} - ${mergeEnd.toLocaleString('default', {month: 'long'})} ${mergeEnd.getDate()})`;
//                     if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                     billItemsByBillId[billId].push({
//                         amount: new Prisma.Decimal(amount),
//                         description,
//                     });
//                     break;
//                 }
//                 continue;
//             } else {
//                 if (isBacktrack) {
//                     let billId = lastBill.id;
//                     let mergeStart = new Date(current);
//                     let mergeEnd = new Date(addonEnd);
//                     let totalAmount = 0;
//                     let tempStart = new Date(mergeStart);
//                     while (tempStart <= mergeEnd) {
//                         let tempEnd = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0);
//                         if (tempEnd > mergeEnd) tempEnd = new Date(mergeEnd);
//                         const daysInMonth = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0).getDate();
//                         const daysUsed = tempEnd.getDate() - tempStart.getDate() + 1;
//                         totalAmount += (Number(p.price) / daysInMonth) * daysUsed;
//                         tempStart = new Date(tempEnd.getFullYear(), tempEnd.getMonth(), tempEnd.getDate() + 1);
//                     }
//                     let amount = Math.round(totalAmount);
//                     let description = `Biaya Layanan Tambahan (${addon.name}) (${mergeStart.toLocaleString('default', {month: 'long'})} ${mergeStart.getDate()} - ${mergeEnd.toLocaleString('default', {month: 'long'})} ${mergeEnd.getDate()})`;
//                     if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                     billItemsByBillId[billId].push({
//                         amount: new Prisma.Decimal(amount),
//                         description,
//                     });
//                     break;
//                 } else {
//                     let monthStart = new Date(current);
//                     while (monthStart <= intervalEnd) {
//                         let monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
//                         if (monthEnd > intervalEnd) monthEnd = new Date(intervalEnd);
//                         let billId = findBillIdForDate(monthStart);
//                         const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
//                         const daysUsed = monthEnd.getDate() - monthStart.getDate() + 1;
//                         let amount = Math.round((Number(p.price) / daysInMonth) * daysUsed);
//                         let description = `Biaya Layanan Tambahan (${addon.name}) (${monthStart.toLocaleString('default', {month: 'long'})} ${monthStart.getDate()} - ${monthEnd.toLocaleString('default', {month: 'long'})} ${monthEnd.getDate()})`;
//                         if (billId) {
//                             if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                             billItemsByBillId[billId].push({
//                                 amount: new Prisma.Decimal(amount),
//                                 description,
//                             });
//                         }
//                         monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1);
//                     }
//                 }
//                 current = new Date(intervalEnd.getFullYear(), intervalEnd.getMonth(), intervalEnd.getDate() + 1);
//                 monthOffset = (current.getFullYear() - addonStart.getFullYear()) * 12 + current.getMonth() - addonStart.getMonth();
//             }
//         }
//     }
//     return billItemsByBillId;
// }
//
// /**
//  * Generates bill items for booking add-ons and maps them to bills by due date
//  * @param bookingAddons - Array of booking add-ons
//  * @param bills - Array of bills with id and due_date
//  * @returns Object mapping bill_id to array of bill items
//  */
// export async function generateBookingAddonsBillItems_2(
//     bookingAddons: Pick<BookingAddOn, 'addon_id' | 'start_date' | 'end_date'>[],
//     bills: { id: number, due_date: Date }[]
// ): Promise<{ [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] }> {
//     // Helper: find bill for a given date
//     function findBillIdForDate(date: Date): number | undefined {
//         const y = date.getFullYear();
//         const m = date.getMonth();
//         const bill = bills.find(b => b.due_date.getFullYear() === y && b.due_date.getMonth() === m);
//         return bill?.id;
//     }
//
//     const billItemsByBillId: { [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] } = {};
//
//     for (const bookingAddon of bookingAddons) {
//         const addon = await prisma.addOn.findFirstOrThrow({
//             where: {id: bookingAddon.addon_id},
//             include: {pricing: true},
//         });
//         const addonPricing = addon.pricing.sort((a, b) => a.interval_start - b.interval_start);
//         if (!addonPricing || addonPricing.length === 0) {
//             throw new Error(`No pricing available for AddOn with ID ${bookingAddon.addon_id}`);
//         }
//         const addonStartDate = new Date(bookingAddon.start_date);
//         const addonEndDate = new Date(bookingAddon.end_date);
//         // Throw if add-on start is before the first bill's month
//         if (
//             bills.length === 0 ||
//             addonStartDate.getFullYear() < bills[0].due_date.getFullYear() ||
//             (addonStartDate.getFullYear() === bills[0].due_date.getFullYear() && addonStartDate.getMonth() < bills[0].due_date.getMonth())
//         ) {
//             throw new Error(`AddOn start date (${addonStartDate.toISOString()}) is before the first bill's month (${bills[0]?.due_date?.toISOString?.()})`);
//         }
//         let currentStart = new Date(addonStartDate);
//         let lastBill = bills[bills.length - 1];
//         let lastBillMonth = lastBill.due_date.getMonth();
//         let lastBillYear = lastBill.due_date.getFullYear();
//         while (currentStart <= addonEndDate) {
//             const monthOffset = (currentStart.getFullYear() - addonStartDate.getFullYear()) * 12 + currentStart.getMonth() - addonStartDate.getMonth();
//             const applicablePricing = addonPricing.find(
//                 (pricing) =>
//                     pricing.interval_start <= monthOffset &&
//                     (pricing.interval_end == null || pricing.interval_end >= monthOffset)
//             );
//             if (!applicablePricing) {
//                 throw new Error(`No pricing found for AddOn ${bookingAddon.addon_id}`);
//             }
//             // If currentStart is after the last bill's month, break (shouldn't happen)
//             if (
//                 currentStart.getFullYear() > lastBillYear ||
//                 (currentStart.getFullYear() === lastBillYear && currentStart.getMonth() > lastBillMonth)
//             ) {
//                 break;
//             }
//             // If the add-on's end date is after the last bill's month, merge the remaining period into the last bill
//             let isBacktrack = false;
//             let backtrackEndDate = null;
//             if (
//                 (addonEndDate.getFullYear() > lastBillYear ||
//                     (addonEndDate.getFullYear() === lastBillYear && addonEndDate.getMonth() > lastBillMonth)) &&
//                 (currentStart.getFullYear() === lastBillYear && currentStart.getMonth() === lastBillMonth)
//             ) {
//                 isBacktrack = true;
//                 backtrackEndDate = new Date(addonEndDate);
//             }
//             if (applicablePricing.is_full_payment) {
//                 // Calculate the correct end date for the full payment interval
//                 let fullPaymentDurationMonth = (applicablePricing.interval_end != null ? (applicablePricing.interval_end - applicablePricing.interval_start) : 0) + 1;
//                 // The end of this pricing interval (should be the last day of the interval_end month)
//                 let pricingIntervalEnd = applicablePricing.interval_end != null
//                     ? new Date(addonStartDate.getFullYear(), addonStartDate.getMonth() + applicablePricing.interval_end + 1, 0)
//                     : new Date(addonEndDate);
//                 // The end date for this bill item is the minimum of:
//                 // - pricingIntervalEnd
//                 // - add-on end date
//                 let fullPaymentEndDate = pricingIntervalEnd > addonEndDate ? new Date(addonEndDate) : pricingIntervalEnd;
//                 let amount = Math.round(Number(applicablePricing.price));
//                 let description = `Biaya Layanan Tambahan (${addon.name}) (${currentStart.toLocaleString('default', {month: 'long'})} ${currentStart.getDate()} - ${fullPaymentEndDate.toLocaleString('default', {month: 'long'})} ${fullPaymentEndDate.getDate()})`;
//                 let billId;
//                 if (isBacktrack) {
//                     // Merge the remaining period into the last bill
//                     billId = lastBill.id;
//                     description = `Biaya Layanan Tambahan (${addon.name}) (${currentStart.toLocaleString('default', {month: 'long'})} ${currentStart.getDate()} - ${backtrackEndDate!.toLocaleString('default', {month: 'long'})} ${backtrackEndDate!.getDate()})`;
//                 } else {
//                     billId = findBillIdForDate(currentStart);
//                 }
//                 if (billId) {
//                     if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                     billItemsByBillId[billId].push({
//                         amount: new Prisma.Decimal(amount),
//                         description,
//                     });
//                 }
//                 currentStart = new Date(fullPaymentEndDate.getFullYear(), fullPaymentEndDate.getMonth(), fullPaymentEndDate.getDate() + 1);
//                 if (currentStart > fullPaymentEndDate) break;
//             } else {
//                 let periodStart = new Date(currentStart);
//                 let periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
//                 if (periodEnd > addonEndDate) periodEnd = new Date(addonEndDate);
//                 let billId;
//                 let description;
//                 let amount;
//                 if (isBacktrack) {
//                     // Merge the remaining period into the last bill
//                     billId = lastBill.id;
//                     periodEnd = new Date(addonEndDate);
//                     // Sum the full monthly prices for each month in the merged period
//                     let totalAmount = 0;
//                     let tempStart = new Date(periodStart);
//                     while (tempStart <= periodEnd) {
//                         let tempEnd = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0);
//                         if (tempEnd > periodEnd) tempEnd = new Date(periodEnd);
//                         const daysInMonth = new Date(tempStart.getFullYear(), tempStart.getMonth() + 1, 0).getDate();
//                         const daysUsed = tempEnd.getDate() - tempStart.getDate() + 1;
//                         totalAmount += (Number(applicablePricing.price) / daysInMonth) * daysUsed;
//                         tempStart = new Date(tempEnd.getFullYear(), tempEnd.getMonth(), tempEnd.getDate() + 1);
//                     }
//                     amount = Math.round(totalAmount);
//                     description = `Biaya Layanan Tambahan (${addon.name}) (${periodStart.toLocaleString('default', {month: 'long'})} ${periodStart.getDate()} - ${periodEnd.toLocaleString('default', {month: 'long'})} ${periodEnd.getDate()})`;
//                 } else {
//                     billId = findBillIdForDate(periodStart);
//                     const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
//                     const daysUsed = periodEnd.getDate() - periodStart.getDate() + 1;
//                     amount = Math.round((Number(applicablePricing.price) / daysInMonth) * daysUsed);
//                     description = `Biaya Layanan Tambahan (${addon.name}) (${periodStart.toLocaleString('default', {month: 'long'})} ${periodStart.getDate()} - ${periodEnd.toLocaleString('default', {month: 'long'})} ${periodEnd.getDate()})`;
//                 }
//                 if (billId) {
//                     if (!billItemsByBillId[billId]) billItemsByBillId[billId] = [];
//                     billItemsByBillId[billId].push({
//                         amount: new Prisma.Decimal(amount),
//                         description,
//                     });
//                 }
//                 if (isBacktrack) {
//                     break;
//                 }
//                 currentStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() + 1);
//             }
//         }
//     }
//     return billItemsByBillId;
// }
//
export async function generateBookingAddonsBillItems(
    bookingAddons: Pick<BookingAddOn, 'addon_id' | 'start_date' | 'end_date'>[],
    bills: { id: number, due_date: Date }[]
): Promise<{ [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] }> {
    const billItemsByBillId: { [billId: number]: PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[] } = {};

    function findBillIdByDate(d: Date): number | undefined {
        const bill = bills.find(b => {
            return b.due_date.getMonth() == d.getMonth() && b.due_date.getFullYear() == d.getFullYear();
        });

        return bill?.id;
    }

    function findClosestBillIdByDate(d: Date): number | undefined {
        if (bills.length === 0) return undefined;
        // Sort bills by due_date ascending
        const sorted = bills.slice().sort((a, b) => a.due_date.getTime() - b.due_date.getTime());
        for (const bill of sorted) {
            if (bill.due_date >= d) {
                return bill.id;
            }
        }
        // If all bills are before the date, return the last bill's id
        return sorted[sorted.length - 1].id;
    }

    type BillItemWithDates = BillItemUncheckedCreateInput & {
        _startDate: Date,
        _endDate: Date,
        _shouldBacktrack: boolean
    }

    type BillItemWithPartialDates = PartialBy<BillItemWithDates, "_endDate" | "_startDate" | "_shouldBacktrack">

    function generateDescription(addon: AddOn, billItem: BillItemWithDates) {
        return `Biaya Layanan Tambahan (${addon.name}) (${billItem._startDate.toLocaleString('default', {month: 'long', day: 'numeric'})} - ${billItem._endDate.toLocaleString('default', {month: 'long', day: 'numeric'})})`
    }

    let allBillItems: BillItemWithPartialDates[] = [];

    for (let bookingAddon of bookingAddons) {
        const currentBillItems: BillItemWithDates[] = [];
        const addon = await prisma.addOn.findFirstOrThrow({
            where: {
                id: bookingAddon.addon_id
            },
            include: {
                pricing: true
            }
        });

        const sortedPricing = addon.pricing
            .sort((a, b) => a.interval_start - b.interval_start);

        const addonStartDate = new Date(bookingAddon.start_date);
        const addonEndDate = new Date(bookingAddon.end_date);

        let currentStartDate = addonStartDate;
        let currentEndDate;

        let monthCount = 0;

        let shouldProrate = false;

        // Logic to create all the bills
        while (currentStartDate < addonEndDate) {
            let shouldBacktrack = false;
            let billId = findBillIdByDate(currentStartDate);
            if (currentBillItems.length > 0 && billId == undefined) {
                billId = findClosestBillIdByDate(currentStartDate);
                shouldBacktrack = currentBillItems.map(bi => bi.bill_id).includes(billId ?? -1);
            }
            if (billId == undefined) {
                throw new Error("No matching bill found")
            }

            const pricing = sortedPricing
                .find(p => {
                    if (p.interval_end != undefined) {
                        return p.interval_start >= monthCount && p.interval_end >= monthCount;
                    } else {
                        return p.interval_start <= monthCount;
                    }
                });

            if (!pricing) {
                throw new Error("Pricing not found");
            }

            if (pricing.interval_end) {
                let currentDuration = pricing.interval_end - pricing.interval_start + 1;
                currentEndDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + currentDuration, currentStartDate.getDate() - 1);

                if (currentEndDate > addonEndDate) {
                    currentEndDate = addonEndDate;
                }

                const billItem: BillItemWithDates = {
                    bill_id: billId,
                    amount: new Prisma.Decimal(Math.round(Number(pricing.price))),
                    description: "TODO!", // TODO!
                    _startDate: currentStartDate,
                    _endDate: currentEndDate,
                    _shouldBacktrack: shouldBacktrack
                }
                currentBillItems.push(billItem);

                currentStartDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth(), currentEndDate.getDate() + 1);
                if (currentStartDate.getDate() != 1) shouldProrate = true;
                monthCount += currentDuration
            } else {
                if (currentStartDate.getDate() != 1) shouldProrate = true;
                if (shouldProrate) {
                    currentEndDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + 1, 0);
                    shouldProrate = false;
                } else {
                    currentEndDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + 1, currentStartDate.getDate() - 1);
                }

                if (currentEndDate > addonEndDate) {
                    currentEndDate = addonEndDate;
                }

                const currentMonthStart = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth(), 1);
                const currentMonthEnd = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() + 1, 0);
                const daysInMonth = currentMonthEnd.getDate() - currentMonthStart.getDate() + 1;
                const daysActive = currentEndDate.getDate() - currentStartDate.getDate() + 1;
                const currentPrice = (pricing.price / daysInMonth * daysActive);
                const roundedPrice = Math.ceil((currentPrice / 100)) * 100

                const billItem: BillItemWithDates = {
                    bill_id: billId,
                    amount: new Prisma.Decimal(roundedPrice),
                    description: "TODO!", // TODO!
                    _startDate: currentStartDate,
                    _endDate: currentEndDate,
                    _shouldBacktrack: shouldBacktrack,
                }
                currentBillItems.push(billItem);

                currentStartDate = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth(), currentEndDate.getDate() + 1);
                if (currentStartDate.getDate() != 1) shouldProrate = true;
                monthCount += 1
            }
        }

        // Logic to backtrack
        // Find all bill items that have _shouldBacktrack=true and merge them into the last valid bill item for that bill_id
        const backtrackItems = currentBillItems.filter(item => item._shouldBacktrack);
        for (const backtrackItem of backtrackItems) {
            // Find all items for this bill_id that are not backtrack
            const sameBillItems = currentBillItems.filter(item => item.bill_id === backtrackItem.bill_id && !item._shouldBacktrack);
            if (sameBillItems.length === 0) continue;
            // Find the earliest start and latest end among the merged items
            const lastItem = sameBillItems[sameBillItems.length - 1];
            // Update the last valid bill item
            lastItem.amount = new Prisma.Decimal(Number(lastItem.amount) + Number(backtrackItem.amount));
            lastItem._endDate = backtrackItem._endDate;
            }

        // Remove all backtrack items from billItems
        for (let i = currentBillItems.length - 1; i >= 0; i--) {
            if (currentBillItems[i]._shouldBacktrack) {
                currentBillItems.splice(i, 1);
            }
        }

        // Logic to create description, remove internal fields and concat
        for (let i = currentBillItems.length - 1; i >= 0; i--) {
            let curr: BillItemWithPartialDates = currentBillItems[i];
            curr.description = generateDescription(addon, currentBillItems[i])
            delete curr._endDate;
            delete curr._startDate;
            delete curr._shouldBacktrack;
            allBillItems.push(curr);
        }
    }

    const groupedByBillId: typeof billItemsByBillId = allBillItems.reduce((acc: typeof billItemsByBillId, item) => {
        const key = item.bill_id;
        // if this bill_id hasn't been seen yet, initialize with an empty array
        if (!acc[key]) {
            acc[key] = [];
        }
        // push the current item onto its bill_id array
        acc[key].push(item);
        return acc;
    }, {});

    // return billItemsByBillId
    return groupedByBillId;
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
                description: `Tagihan untuk Bulan ${startDate.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric'
                })}`,
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
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {
                        month: 'long',
                        year: 'numeric'
                    })}`,
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
                description: `Tagihan untuk Bulan ${lastMonthStartDate.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric'
                })}`,
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
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {
                        month: 'long',
                        year: 'numeric'
                    })}`,
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
