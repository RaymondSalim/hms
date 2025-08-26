"use server";

import {OmitTimestamp, PartialBy} from "@/app/_db/db";
import {Bill, BillItem, BillType, Booking, BookingAddOn, CheckInOutLog, DepositStatus, Prisma,} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
import {number, object} from "zod";
import {getLastDateOfBooking} from "@/app/_lib/util";
import {
    BookingsIncludeAll,
    createBooking,
    getAllBookings,
    getBookingsWithUnpaidBills,
    updateBookingByID
} from "@/app/_db/bookings";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {updateDepositStatus} from "@/app/_db/deposit";
import {revalidateTag} from "next/cache";
import {
    generatePaymentBillMappingFromPaymentsAndBills
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {
    addMonths,
    differenceInDays,
    endOfMonth,
    format,
    getDaysInMonth,
    isSameMonth,
    max,
    startOfMonth,
    subDays
} from "date-fns";
import {id as indonesianLocale} from "date-fns/locale";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import BillItemUncheckedCreateWithoutBillInput = Prisma.BillItemUncheckedCreateWithoutBillInput;

type AddonWithDetails = BookingAddOn & { addOn: { name: string, pricing: {is_full_payment: boolean, interval_start: number, interval_end: number | null, price: number}[] } };

function processAddonsForPeriod(
    periodStartDate: Date,
    periodEndDate: Date,
    addOns: AddonWithDetails[]
): BillItemUncheckedCreateWithoutBillInput[] {
    const addonBillItems: BillItemUncheckedCreateWithoutBillInput[] = [];
    if (!addOns || addOns.length === 0) {
        return addonBillItems;
    }

    for (const addon of addOns) {
        const addonDetails = addon.addOn;
        if (!addonDetails) continue;

        const addonStartDate = new Date(addon.start_date);
        const addonEndDate = addon.end_date ? new Date(addon.end_date) : null;

        if (addonEndDate && addonEndDate < periodStartDate) continue;
        if (addonStartDate > periodEndDate) continue;

        for (const pricing of addonDetails.pricing) {
            const tierStartMonth = pricing.interval_start;
            const tierEndMonth = pricing.interval_end;

            if (pricing.is_full_payment) {
                const paymentDate = addMonths(addonStartDate, tierStartMonth);
                if (paymentDate >= periodStartDate && paymentDate <= periodEndDate) {
                    const pricingDuration = (tierEndMonth ?? tierStartMonth) - tierStartMonth + 1;
                    const fullPaymentEndDate = subDays(addMonths(addonStartDate, tierStartMonth + pricingDuration), 1);

                    addonBillItems.push({
                        description: `Biaya Layanan Tambahan (${addonDetails.name}) (${format(paymentDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(fullPaymentEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
                        amount: pricing.price,
                        type: BillType.GENERATED
                    });
                }
            } else {
                const tierStartDate = addMonths(addonStartDate, tierStartMonth);
                const tierEndDateAbs = (tierEndMonth !== null) ? subDays(addMonths(addonStartDate, tierEndMonth + 1), 1) : null;

                if (tierStartDate <= periodEndDate && (!tierEndDateAbs || tierEndDateAbs >= periodStartDate)) {
                    const effectiveStartDate = max([periodStartDate, tierStartDate, addonStartDate]);
                    let effectiveEndDate = periodEndDate;
                    if (tierEndDateAbs && tierEndDateAbs < periodEndDate) {
                        effectiveEndDate = tierEndDateAbs;
                    }
                    if (addonEndDate && addonEndDate < effectiveEndDate) {
                        effectiveEndDate = addonEndDate;
                    }

                    if (effectiveStartDate > effectiveEndDate) continue;

                    const daysInMonth = getDaysInMonth(periodStartDate);
                    const daysToBill = differenceInDays(effectiveEndDate, effectiveStartDate) + 1;

                    let amount;
                    if (daysToBill < daysInMonth) {
                        amount = new Prisma.Decimal(Math.ceil(Number(pricing.price) / daysInMonth * daysToBill));
                    } else {
                        amount = new Prisma.Decimal(Number(pricing.price));
                    }

                    addonBillItems.push({
                        description: `Biaya Layanan Tambahan (${addonDetails.name}) (${format(effectiveStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(effectiveEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
                        amount,
                        type: BillType.GENERATED,
                    });
                }
            }
        }
    }
    return addonBillItems;
}

export type UpsertBookingPayload = OmitTimestamp<BookingsIncludeAll>

export async function upsertBookingAction(reqData: UpsertBookingPayload) {
    const {success, data, error} = bookingSchema.safeParse(reqData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    after(() => {
        serverLogger.flush();
    });

    // Handle rolling bookings
    if (data.is_rolling) {
        try {
            // Overlap check for rolling bookings
            const overlappingBooking = await prisma.booking.findFirst({
                where: {
                    room_id: data.room_id,
                    id: data.id ? { not: data.id } : undefined,
                    OR: [
                        { is_rolling: true, end_date: null },
                        { end_date: { gte: data.start_date } }
                    ]
                }
            });

            if (overlappingBooking) {
                return { failure: `Kamar sudah terisi untuk tanggal tersebut (ID Pemesanan: ${overlappingBooking.id})` };
            }

            if (data.id) {
                const res = await prisma.$transaction(async (tx) => {
                    const { addOns, deposit, ...bookingData } = data;

                    // Handle Addons CUD
                    const existingAddOns = await tx.bookingAddOn.findMany({
                        where: { booking_id: data.id },
                    });

                    const newAddOns = addOns?.filter((addon) => !addon.id) || [];
                    const updateAddOns = addOns?.filter((addon) =>
                        existingAddOns.some((ea) => ea.id === addon.id)
                    ) || [];
                    const deleteAddOnIDs = existingAddOns
                        .filter((ea) => !addOns?.some((addon) => addon.id === ea.id))
                        .map((ea) => ea.id);

                    if (deleteAddOnIDs.length > 0) {
                        await tx.bookingAddOn.deleteMany({
                            where: { id: { in: deleteAddOnIDs } },
                        });
                    }

                    for (const addon of updateAddOns) {
                        await tx.bookingAddOn.update({
                            where: { id: addon.id! },
                            data: addon,
                        });
                    }

                    if (newAddOns.length > 0) {
                        await tx.bookingAddOn.createMany({
                            // @ts-expect-error invalid type
                            data: newAddOns.map((na) => ({ ...na, booking_id: data.id! })),
                        });
                    }

                    // Update the booking
                    const updatedBooking = await tx.booking.update({
                        where: { id: data.id },
                        data: {
                            ...bookingData,
                            duration_id: null,
                            end_date: null,
                            is_rolling: true,
                        },
                        include: {
                            rooms: {
                                include: {
                                    locations: true,
                                }
                            },
                            durations: true,
                            bookingstatuses: true,
                            tenants: true,
                            checkInOutLogs: true,
                            addOns: {
                                include: {
                                    addOn: true
                                }
                            },
                            deposit: true,
                        }
                    });

                    // Handle deposit updates
                    if (deposit) {
                        const existingDeposit = await tx.deposit.findFirst({
                            where: { booking_id: data.id }
                        });
                        if (existingDeposit) {
                            await tx.deposit.update({
                                where: { id: existingDeposit.id },
                                data: { amount: new Prisma.Decimal(deposit.amount) }
                            });
                        } else {
                            await tx.deposit.create({
                                data: {
                                    booking_id: data.id!,
                                    amount: new Prisma.Decimal(deposit.amount),
                                    status: DepositStatus.UNPAID
                                }
                            });
                        }
                    }

                    // Regenerate bills and re-allocate payments
                    const today = new Date();
                    const startOfCurrentMonth = startOfMonth(today);

                    // 1. Delete all payment-bill links for the entire booking
                    const allBillsForBooking = await tx.bill.findMany({
                        where: { booking_id: data.id },
                        select: { id: true }
                    });
                    const allBillIds = allBillsForBooking.map(b => b.id);
                    if (allBillIds.length > 0) {
                        await tx.paymentBill.deleteMany({
                            where: { bill_id: { in: allBillIds } }
                        });
                    }

                    // 2. Delete current and future bills
                    const futureBills = await tx.bill.findMany({
                        where: {
                            booking_id: data.id,
                            due_date: { gte: startOfCurrentMonth }
                        },
                        select: { id: true }
                    });
                    const futureBillIds = futureBills.map(b => b.id);

                    if (futureBillIds.length > 0) {
                        await tx.billItem.deleteMany({
                            where: { bill_id: { in: futureBillIds } }
                        });
                        await tx.bill.deleteMany({
                            where: { id: { in: futureBillIds } }
                        });
                    }

                    // 3. Regenerate bills
                    let existingBills = await tx.bill.findMany({ where: { booking_id: data.id } });
                    const updatedAddons = await tx.bookingAddOn.findMany({
                        where: { booking_id: data.id },
                        include: { addOn: { include: { pricing: { orderBy: { interval_start: 'asc' } } } } }
                    });
                    const bookingWithDetails = { ...updatedBooking, addOns: updatedAddons };

                    // Regenerate current month's bill
                    const currentMonthBill = await generateNextMonthlyBill(bookingWithDetails, existingBills, today);
                    if (currentMonthBill) {
                        const createdBill = await tx.bill.create({ data: { ...currentMonthBill }});
                        existingBills.push(createdBill);
                    }

                    // Regenerate next month's bill
                    const nextMonth = addMonths(today, 1);
                    const nextMonthBill = await generateNextMonthlyBill(bookingWithDetails, existingBills, nextMonth);
                    if (nextMonthBill) {
                        await tx.bill.create({ data: { ...nextMonthBill }});
                    }

                    // Re-attach Deposit Bill Item
                    const depositRecord = await tx.deposit.findFirst({ where: { booking_id: data.id } });
                    if (depositRecord) {
                        await tx.billItem.deleteMany({
                            where: {
                                bill: { booking_id: data.id },
                                related_id: { path: ['deposit_id'], equals: depositRecord.id }
                            }
                        });

                        const earliestBill = await tx.bill.findFirst({
                            where: { booking_id: data.id },
                            orderBy: { due_date: 'asc' }
                        });

                        if (earliestBill) {
                            await tx.billItem.create({
                                data: {
                                    bill_id: earliestBill.id,
                                    amount: depositRecord.amount,
                                    description: 'Deposit Kamar',
                                    related_id: { deposit_id: depositRecord.id } as any,
                                    type: 'CREATED'
                                }
                            });
                        }
                    }

                    // 4. Re-allocate payments
                    const allPayments = await tx.payment.findMany({ where: { booking_id: data.id } });
                    const allBillsNow = await tx.bill.findMany({ where: { booking_id: data.id }, include: { bill_item: true } });
                    const paymentBillMappings = await generatePaymentBillMappingFromPaymentsAndBills(allPayments, allBillsNow);
                    if (paymentBillMappings.length > 0) {
                        await tx.paymentBill.createMany({ data: paymentBillMappings });
                    }

                    return updatedBooking;
                });
                return { success: res };
            } else {
                const res = await prisma.$transaction(async (tx) => {
                    const { addOns, deposit, ...bookingData } = data;

                    const newBooking = await tx.booking.create({
                        data: {
                            ...bookingData,
                            duration_id: null,
                            end_date: null,
                            is_rolling: true,
                        },
                        include: {
                            rooms: {
                                include: {
                                    locations: true,
                                }
                            },
                            durations: true,
                            bookingstatuses: true,
                            tenants: true,
                            checkInOutLogs: true,
                            addOns: {
                                include: {
                                    addOn: true
                                }
                            },
                            deposit: true,
                        }
                    });

                    if (addOns) {
                        const validAddOns = addOns.filter((addon): addon is typeof addon & { addon_id: string } => !!addon.addon_id);
                        if (validAddOns.length > 0) {
                            await tx.bookingAddOn.createMany({
                                data: validAddOns.map(na => ({
                                    ...na,
                                    booking_id: newBooking.id
                                }))
                            });
                        }
                    }

                    const bookingAddonsWithDetails = [];
                    if (addOns) {
                        for (const addon of addOns) {
                            const addonDetails = await tx.addOn.findUnique({
                                where: { id: addon.addon_id },
                                include: { pricing: { orderBy: { interval_start: 'asc' } } }
                            });
                            if (addonDetails) {
                                bookingAddonsWithDetails.push({
                                    ...addon,
                                    addOn: addonDetails
                                });
                            }
                        }
                    }

                    const initialBills = await generateInitialBillsForRollingBooking({
                        ...newBooking,
                        // @ts-expect-error invalid type
                        addOns: bookingAddonsWithDetails,
                        deposit: deposit ? { amount: new Prisma.Decimal(deposit.amount) } : null
                    }, new Date());

                    const createdBills: Bill[] = [];
                    for (const bill of initialBills) {
                        const createdBill = await tx.bill.create({
                           data: {
                               ...bill,
                               booking_id: newBooking.id
                           }
                        });
                        createdBills.push(createdBill);
                    }

                    if (deposit) {
                        const depositRecord = await tx.deposit.create({
                            data: {
                                booking_id: newBooking.id,
                                amount: new Prisma.Decimal(deposit.amount),
                                status: DepositStatus.UNPAID
                            }
                        });
                        if (createdBills.length > 0) {
                             await tx.billItem.create({
                                data: {
                                    bill_id: createdBills[0].id,
                                    amount: depositRecord.amount,
                                    description: 'Deposit Kamar',
                                    related_id: { deposit_id: depositRecord.id } as any,
                                    type: 'CREATED',
                                }
                            });
                        }
                    }

                    return newBooking;
                });
                return { success: res };
            }
        } catch (error) {
            serverLogger.error("[upsertBookingAction][Rolling]", {error});
            return { failure: "Gagal memproses pemesanan bulanan." };
        }
    }

    // Handle fixed-term bookings
    const {id, fee, start_date, duration_id, ...otherBookingData} = data;

    const duration = await prisma.duration.findUnique({
        where: {id: duration_id!},
    });

    if (!duration) {
        return {
            failure: "Invalid Duration ID"
        };
    }

    const lastDate = getLastDateOfBooking(start_date, duration);
    data.end_date = lastDate;

    // Improved overlap check for fixed-term bookings
    const overlappingBooking = await prisma.booking.findFirst({
        where: {
            room_id: data.room_id,
            id: data.id ? { not: data.id } : undefined,
            start_date: {
                lt: lastDate,
            },
            end_date: {
                gt: start_date,
            },
        }
    });

    if (overlappingBooking) {
        return {
            failure: `Pemesanan tumpang tindih dengan ID: ${overlappingBooking.id}`
        };
    }

    try {
        let res;
        if (data?.id) {
            // @ts-expect-error TS2345
            res = await updateBookingByID(data.id, data, duration);
        } else {
            // @ts-expect-error TS2345
            res = await createBooking(data, duration);
        }
        return {
            ...res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertBookingAction][PrismaKnownError]", {error});
            if (error.code == "P2002") {
                return {failure: "Booking is taken"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[upsertBookingAction][PrismaUnknownError]", {error});
        } else {
            serverLogger.error("[upsertBookingAction]", {error});
        }

        return {failure: "Request unsuccessful"};
    }
}

export async function getAllBookingsAction(...args: Parameters<typeof getAllBookings>) {
    return getAllBookings(...args);
}

export async function getBookingsWithUnpaidBillsAction(...args: Parameters<typeof getBookingsWithUnpaidBills>) {
    return getBookingsWithUnpaidBills(...args);
}

export async function deleteBookingAction(id: number) {
    after(() => {
        serverLogger.flush();
    });
    const parsedData = object({id: number().positive()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return {
            errors: parsedData.error.format()
        };
    }

    try {
        let res = await prisma.booking.delete({
            where: {
                id: parsedData.data.id,
            }
        });

        return {
            success: res,
        };
    } catch (error) {
        serverLogger.error("deleteBookingAction", {error, booking_id: id});
        return {
            failure: "Error deleting booking",
        };
    }

}

export async function checkInOutAction(data: {
    booking_id: number,
    action: CheckInOutType,
    depositStatus?: string,
    refundedAmount?: number,
    eventDate?: Date
}): Promise<GenericActionsType<CheckInOutLog>> {
    const booking = await prisma.booking.findFirst({
        where: {
            id: data.booking_id
        },
        include: {
            deposit: true,
            rooms: true
        }
    });

    if (!booking) {
        return {
            failure: "Booking not found"
        };
    }

    return await prisma.$transaction(async (tx) => {
        // Create the check in/out log
        const checkInOutLog = await tx.checkInOutLog.create({
            data: {
                tenant_id: booking.tenant_id!,
                booking_id: data.booking_id,
                event_date: data.eventDate ? new Date(data.eventDate) : new Date(),
                event_type: data.action
            },
        });

        // Handle checkout-specific logic
        if (data.action === CheckInOutType.CHECK_OUT) {
            // Update deposit status if provided
            if (data.depositStatus && booking.deposit) {
                // Use updateDepositStatus to ensure proper transaction creation for refunds
                await updateDepositStatus({
                    depositId: booking.deposit.id,
                    newStatus: data.depositStatus as any,
                    refundedAmount: data.refundedAmount,
                    tx: tx
                });
            }

            // TODO: Update room status to available (this can be moved to a separate ticket)
            // For now, we'll just log that checkout is complete
            // console.log(`Checkout completed for booking ${data.booking_id}. Room status update can be implemented in a separate ticket.`);
        }

        return {
            success: checkInOutLog
        };
    });
}

export async function matchBillItemsToBills(
    billItemsByDueDate: Map<Date, Omit<BillItem, "bill_id">[]>,
    bills: Pick<Bill, "due_date" | "id">[]
): Promise<Map<number, Omit<BillItem, "bill_id">[]>> {
    after(() => {
        serverLogger.flush();
    });
    // Sort bills by due_date for easier matching
    const sortedBills = bills.sort((a, b) => a.due_date.getTime() - b.due_date.getTime());

    // Create a map to hold the results
    const matchedBillItems: Map<number, Omit<BillItem, "bill_id">[]> = new Map();

    Array.from(billItemsByDueDate.entries()).forEach(([dueDate, billItems]) => {
        let closestBill: Pick<Bill, "due_date" | "id"> | null = null;

        // Find the closest bill by due_date
        for (const bill of sortedBills) {
            if (
                !closestBill ||
                Math.abs(bill.due_date.getTime() - dueDate.getTime()) <
                Math.abs(closestBill.due_date.getTime() - dueDate.getTime())
            ) {
                closestBill = bill;
            }

            // If we find an earlier match, we prefer it
            if (bill.due_date.getTime() >= dueDate.getTime()) {
                break;
            }
        }

        if (closestBill) {
            if (!matchedBillItems.has(closestBill.id)) {
                matchedBillItems.set(closestBill.id, []);
            }
            matchedBillItems.get(closestBill.id)?.push(...billItems);
        } else {
            serverLogger.debug(`[matchBillItemsToBills] No matching bill found for due_date: ${dueDate}`);
        }
    });

    return matchedBillItems;
}

/**
 * Updates a rolling booking to schedule its end date.
 * This action is transactional, ensuring the booking is updated properly.
 * @param data - An object containing the bookingId and endDate.
 * @returns A success or failure response.
 */
export async function scheduleEndOfStayAction(data: {
    bookingId: number;
    endDate: Date;
}) {
    const { bookingId, endDate } = data;

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
        }
    });

    if (!booking) {
        return {
            failure: "Booking tidak ditemukan",
        };
    }

    if (!booking.is_rolling) {
        return {
            failure: "Booking bukan rolling",
        };
    }

    if (endDate < booking.start_date) {
        return {
            failure: "Tanggal selesai harus setelah tanggal mulai",
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    end_date: endDate,
                    is_rolling: false,
                },
            });
        });

        revalidateTag("bookings");
        return { success: true };
    } catch (error) {
        return { failure: "Gagal memperbarui pemesanan." };
    }
}

/**
 * Generates the initial set of bills for a new rolling booking.
 * It creates a prorated bill for the first partial month and full bills for all subsequent months up to the current month.
 * @param booking - The booking object for which to generate bills.
 * @param currentDate - The current date to generate bills up to (defaults to today).
 * @returns A promise that resolves to an array of the newly created bills.
 */
export async function generateInitialBillsForRollingBooking(booking: Pick<Booking, 'start_date' | 'fee' | 'second_resident_fee'> & {
    deposit?: { amount: Prisma.Decimal } | null,
    addOns?: (BookingAddOn & { addOn: { name: string, pricing: {is_full_payment: boolean, interval_start: number, interval_end: number | null, price: number}[] } })[]
}, currentDate: Date = new Date()): Promise<PartialBy<Prisma.BillUncheckedCreateInput, "booking_id">[]> {
    const { start_date, fee, second_resident_fee, addOns } = booking;
    const bills: PartialBy<Prisma.BillUncheckedCreateInput, "booking_id">[] = [];
    const today = currentDate;

    // First bill (prorated for the first month)
    const firstBillEndDate = endOfMonth(start_date);
    const daysInFirstMonth = getDaysInMonth(start_date);
    const proratedDays = daysInFirstMonth - start_date.getDate() + 1;
    const proratedAmount = (proratedDays / daysInFirstMonth) * Number(fee);

    const firstBillItems: BillItemUncheckedCreateWithoutBillInput[] = [{
        description: `Sewa Kamar (${format(start_date, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(firstBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        type: BillType.GENERATED
    }];

    if (second_resident_fee) {
        const proratedSecondResidentFee = (proratedDays / daysInFirstMonth) * Number(second_resident_fee);
        firstBillItems.push({
            description: `Biaya Penghuni Kedua (${format(start_date, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(firstBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: new Prisma.Decimal(proratedSecondResidentFee.toFixed(2)),
            type: BillType.GENERATED
        });
    }

    const firstBillAddonItems = processAddonsForPeriod(start_date, firstBillEndDate, addOns ?? []);
    firstBillItems.push(...firstBillAddonItems);

    bills.push({
        description: `Tagihan untuk Bulan ${format(start_date, 'MMMM yyyy', { locale: indonesianLocale })}`,
        due_date: firstBillEndDate,
        bill_item: {
            create: firstBillItems
        }
    });

    // Generate bills for all subsequent months up to the current month
    let currentMonth = startOfMonth(new Date(start_date.getFullYear(), start_date.getMonth() + 1, 1));

    while (currentMonth <= startOfMonth(today)) {
        const billEndDate = endOfMonth(currentMonth);

        const billItems: BillItemUncheckedCreateWithoutBillInput[] = [{
            description: `Sewa Kamar (${format(currentMonth, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(billEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: fee,
            type: BillType.GENERATED
        }];

        // Add second resident fee if exists
        if (second_resident_fee) {
            billItems.push({
                description: `Biaya Penghuni Kedua (${format(currentMonth, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(billEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
                amount: second_resident_fee,
                type: BillType.GENERATED
            });
        }
        
        const addonItems = processAddonsForPeriod(currentMonth, billEndDate, addOns ?? []);
        billItems.push(...addonItems);

        bills.push({
            description: `Tagihan untuk Bulan ${format(currentMonth, 'MMMM yyyy', { locale: indonesianLocale })}`,
            due_date: billEndDate,
            bill_item: {
                create: billItems
            }
        });

        // Move to next month
        currentMonth = startOfMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }

    return bills;
}

/**
 * Generates the next monthly bill for an active rolling booking.
 * This function is intended to be called by a recurring job (cron).
 * @param booking - The booking for which to potentially generate a bill.
 * @param existingBills - An array of bills that already exist for the booking.
 * @param date - The current date, used to determine which month's bill to create.
 * @returns The new bill object if one was created, otherwise null.
 */
export async function generateNextMonthlyBill(booking: Booking & {
    addOns?: (BookingAddOn & { addOn: { name: string, pricing: {is_full_payment: boolean, interval_start: number, interval_end: number | null, price: number}[] } })[]
}, existingBills: Bill[], date: Date): Promise<Prisma.BillCreateInput | null> {
    after(() => {
        serverLogger.flush();
    });

    // 1. Pre-checks
    if (booking.end_date && date > booking.end_date) {
        return null; // Don't bill after booking has ended
    }

    const billStartDate = startOfMonth(date);
    const billEndDate = endOfMonth(billStartDate);

    // Don't generate a bill for a period that has already been billed.
    if (existingBills.some(b => isSameMonth(b.due_date, billEndDate))) {
        return null;
    }

    // Don't generate a bill for a period completely before the booking starts.
    if (billEndDate < booking.start_date) {
        return null;
    }

    // 2. Calculate proration for main fees
    const effectiveStartDate = max([billStartDate, booking.start_date]);
    const daysInMonth = getDaysInMonth(billStartDate);
    const daysToBill = differenceInDays(billEndDate, effectiveStartDate) + 1;
    const isProrated = daysToBill < daysInMonth;

    const billItems: BillItemUncheckedCreateWithoutBillInput[] = [];

    // Main fee
    const mainFeeAmount = isProrated ? (daysToBill / daysInMonth) * Number(booking.fee) : Number(booking.fee);
    billItems.push({
        description: `Sewa Kamar (${format(effectiveStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(billEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
        amount: new Prisma.Decimal(mainFeeAmount.toFixed(2)),
        type: BillType.GENERATED
    });

    // Second resident fee
    if (booking.second_resident_fee) {
        const secondFeeAmount = isProrated ? (daysToBill / daysInMonth) * Number(booking.second_resident_fee) : Number(booking.second_resident_fee);
        billItems.push({
            description: `Biaya Penghuni Kedua (${format(effectiveStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(billEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: new Prisma.Decimal(secondFeeAmount.toFixed(2)),
            type: BillType.GENERATED
        });
    }

    // 3. Process Addons for the period
    const addonItems = processAddonsForPeriod(billStartDate, billEndDate, booking.addOns ?? []);
    billItems.push(...addonItems);


    // 4. Construct the bill
    const billDescription = `Tagihan untuk Bulan ${format(billStartDate, 'MMMM yyyy', { locale: indonesianLocale })}`;
    return {
        description: billDescription,
        due_date: billEndDate,
        bookings: { connect: { id: booking.id } },
        bill_item: {
            create: billItems
        }
    };
}

/**
 * Schedules the end of a rolling booking by setting its end date.
 * This also sets the 'is_rolling' flag to false.
 * @param booking - The booking to update.
 * @param endDate - The new end date for the booking.
 * @returns The updated booking object.
 */
export async function scheduleEndOfRollingBooking(booking: Booking, endDate: Date): Promise<Booking> {
    return prisma.booking.update({
        where: { id: booking.id },
        data: {
            end_date: endDate,
            is_rolling: false
        }
    });
}

/**
 * Schedules the end of an addon service for a specific booking.
 * @param data - An object containing the bookingId, addonId, and endDate.
 * @returns A success or failure response.
 */
export async function scheduleEndOfAddonAction(data: {
    bookingId: number;
    addonId: string;
    endDate: Date;
}) {
    const { bookingId, addonId, endDate } = data;

    const bookingAddon = await prisma.bookingAddOn.findFirst({
        where: {
            id: addonId,
            booking_id: bookingId,
        },
        include: {
            addOn: true,
            booking: true
        }
    });

    if (!bookingAddon) {
        return {
            failure: "Layanan tambahan tidak ditemukan",
        };
    }

    if (!bookingAddon.is_rolling) {
        return {
            failure: "Layanan tambahan bukan rolling",
        };
    }

    if (endDate < bookingAddon.start_date) {
        return {
            failure: "Tanggal selesai harus setelah tanggal mulai",
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.bookingAddOn.update({
                where: { id: addonId },
                data: {
                    end_date: endDate,
                    is_rolling: false,
                },
            });
        });

        revalidateTag("bookings");
        return { success: true };
    } catch (error) {
        return { failure: "Gagal memperbarui layanan tambahan." };
    }
}
