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
    getBillsWithPayments
} from "@/app/_db/bills";
import {OmitIDTypeAndTimestamp, OmitTimestamp, PartialBy} from "@/app/_db/db";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {billSchemaWithOptionalID} from "@/app/_lib/zod/bill/zod";
import {billItemCreateSchema, billItemUpdateSchema} from "@/app/_lib/zod/bill-item/zod";
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

    try {
        let res;
        // Update - only allow due_date changes
        if (data?.id) {
            // For updates, only allow due_date to be modified
            const updateData = {
                due_date: data.due_date
            };

            res = await prisma.$transaction(async (tx) => {
                // Update only the due_date
                await tx.bill.update({
                    where: { id: data.id! },
                    data: updateData
                });

                // Sync payment allocations since due_date affects payment priority
                await syncBillsWithPaymentDate(data.booking_id, tx);

                return tx.bill.findFirst({
                    where: {id: data.id!},
                    include: billIncludeAll.include
                });
            });

        } else {
            // Create - allow all fields
            let parsedBillData: PartialBy<OmitTimestamp<Bill>, "id"> = {
                ...data,
                description: data?.description ?? "",
            };

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
 * Generates bill items for booking add-ons and maps them to bills by due date
 * @param bookingAddons - Array of booking add-ons
 * @param bills - Array of bills with id and due_date
 * @returns Object mapping bill_id to array of bill items
 */
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

/**
 * Updates a bill item
 * @param billItemData - Bill item data to update
 * @returns Success response with updated bill item data or error information
 */
export async function updateBillItemAction(billItemData: {
    id: number;
    description?: string;
    amount?: number;
    internal_description?: string;
}) {
    const {success, data, error} = billItemUpdateSchema.safeParse(billItemData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    try {
        const res = await prisma.$transaction(async (tx) => {
            // Update the bill item
            const updatedBillItem = await tx.billItem.update({
                where: { id: data.id },
                data: {
                    description: data.description,
                    amount: data.amount ? new Prisma.Decimal(data.amount) : undefined,
                    internal_description: data.internal_description,
                }
            });

            // Get the bill with all related data for response
            const bill = await tx.bill.findFirst({
                where: { id: updatedBillItem.bill_id },
                include: billIncludeAll.include
            });

            return {
                billItem: updatedBillItem,
                bill: bill
            };
        });

        return {
            success: res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[updateBillItemAction]", error.code, error.message);
            if (error.code == "P2025") {
                return {failure: "Bill item tidak ditemukan"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[updateBillItemAction]", error.message);
        }

        return {failure: "Gagal memperbarui rincian tagihan"};
    }
}

/**
 * Deletes a bill item
 * @param id - The bill item ID to delete
 * @returns Success response with deleted bill item data or error information
 */
export async function deleteBillItemAction(id: number) {
    try {
        const res = await prisma.$transaction(async (tx) => {
            // Get the bill item first to get bill_id
            const billItem = await tx.billItem.findUnique({
                where: { id },
                select: { bill_id: true }
            });

            if (!billItem) {
                throw new Error("Bill item tidak ditemukan");
            }

            // Delete the bill item
            const deletedBillItem = await tx.billItem.delete({
                where: { id }
            });

            // Get the updated bill with all related data for response
            const bill = await tx.bill.findFirst({
                where: { id: billItem.bill_id },
                include: billIncludeAll.include
            });

            return {
                billItem: deletedBillItem,
                bill: bill
            };
        });

        return {
            success: res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[deleteBillItemAction]", error.code, error.message);
            if (error.code == "P2025") {
                return {failure: "Bill item tidak ditemukan"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[deleteBillItemAction]", error.message);
        }

        return {failure: "Gagal menghapus rincian tagihan"};
    }
}

/**
 * Creates a new bill item
 * @param billItemData - Bill item data to create
 * @returns Success response with created bill item data or error information
 */
export async function createBillItemAction(billItemData: {
    bill_id: number;
    description: string;
    amount: number;
    internal_description?: string;
    type?: BillType;
}) {
    const {success, data, error} = billItemCreateSchema.safeParse(billItemData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    try {
        const res = await prisma.$transaction(async (tx) => {
            // Create the bill item
            const createdBillItem = await tx.billItem.create({
                data: {
                    bill_id: data.bill_id,
                    description: data.description,
                    amount: new Prisma.Decimal(data.amount),
                    internal_description: data.internal_description,
                    type: (data.type as BillType) || BillType.CREATED,
                }
            });

            // Get the bill with all related data for response
            const bill = await tx.bill.findFirst({
                where: { id: data.bill_id },
                include: billIncludeAll.include
            });

            return {
                billItem: createdBillItem,
                bill: bill
            };
        });

        return {
            success: res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[createBillItemAction]", error.code, error.message);
            if (error.code == "P2003") {
                return {failure: "Bill tidak ditemukan"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[createBillItemAction]", error.message);
        }

        return {failure: "Gagal membuat rincian tagihan"};
    }
}
