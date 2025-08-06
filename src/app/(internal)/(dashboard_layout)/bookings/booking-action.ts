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
import {endOfMonth, format, getDaysInMonth, startOfMonth} from "date-fns";
import {id as indonesianLocale} from "date-fns/locale";
import BillItemUncheckedCreateWithoutBillInput = Prisma.BillItemUncheckedCreateWithoutBillInput;

export type UpsertBookingPayload = OmitTimestamp<BookingsIncludeAll>

export async function upsertBookingAction(reqData: UpsertBookingPayload) {
    const {success, data, error} = bookingSchema.safeParse(reqData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

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
                const res = await prisma.booking.update({
                    where: { id: data.id },
                    // @ts-expect-error type
                    data: {
                        ...data,
                        duration_id: null,
                        end_date: null,
                        is_rolling: true,
                    }
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
                        }
                    });

                    const initialBills = await generateInitialBillsForRollingBooking(newBooking);
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
        } catch (e) {
            console.error("[upsertBookingAction][Rolling]", e);
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
            console.error("[upsertBookingAction][PrismaKnownError]", error.code, error.message);
            if (error.code == "P2002") {
                return {failure: "Booking is taken"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[upsertBookingAction][PrismaUnknownError]", error.message);
        } else {
            console.error("[upsertBookingAction]", error);
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
        console.error(error);
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
            console.debug(`No matching bill found for due_date: ${dueDate}`);
        }
    });

    return matchedBillItems;
}

/**
 * Updates a rolling booking to schedule its end date and optionally updates the deposit status.
 * This action is transactional, ensuring both the booking and deposit are updated together.
 * @param data - An object containing the bookingId, endDate, and optional depositStatus.
 * @returns A success or failure response.
 */
export async function scheduleEndOfStayAction(data: {
    bookingId: number;
    endDate: Date;
    depositStatus?: DepositStatus;
}) {
    const { bookingId, endDate, depositStatus } = data;

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
        }
    });

    if (!booking) {
        return {
            failure: "Booking tidak ditemukan",
        }
    }

    if (!booking.is_rolling) {
        return {
            failure: "Booking bukan rolling",
        }
    }

    if (endDate < booking.start_date) {
        return {
            failure: "Tanggal selesai harus setelah tanggal mulai",
        }
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

            if (depositStatus) {
                await tx.deposit.update({
                    where: { booking_id: bookingId },
                    data: {
                        status: depositStatus,
                    },
                });
            }
        });

        revalidateTag("bookings");
        return { success: true };
    } catch (error) {
        return { failure: "Gagal memperbarui pemesanan." };
    }
}

/**
 * Generates the initial set of bills for a new rolling booking.
 * It creates a prorated bill for the first partial month and a full bill for the following month.
 * @param booking - The booking object for which to generate bills.
 * @returns A promise that resolves to an array of the newly created bills.
 */
export async function generateInitialBillsForRollingBooking(booking: Pick<Booking, 'start_date' | 'fee' | 'second_resident_fee'> & {
    deposit?: { amount: Prisma.Decimal },
    addOns?: Pick<BookingAddOn, 'addon_id' | 'start_date' | 'end_date'>[]
}): Promise<PartialBy<Prisma.BillUncheckedCreateInput, "booking_id">[]> {
    const { start_date, fee, second_resident_fee, deposit, addOns } = booking;
    const bills: PartialBy<Prisma.BillUncheckedCreateInput, "booking_id">[] = [];

    // First bill (prorated)
    const firstBillEndDate = endOfMonth(start_date);
    const daysInFirstMonth = getDaysInMonth(start_date);
    const proratedDays = daysInFirstMonth - start_date.getDate() + 1;
    const proratedAmount = (proratedDays / daysInFirstMonth) * Number(fee);

    const firstBillItems: BillItemUncheckedCreateWithoutBillInput[] = [{
        description: `Sewa Kamar (${format(start_date, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(firstBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        type: BillType.GENERATED
    }];

    // Add second resident fee if exists
    if (second_resident_fee) {
        const proratedSecondResidentFee = (proratedDays / daysInFirstMonth) * Number(second_resident_fee);
        firstBillItems.push({
            description: `Biaya Penghuni Kedua (${format(start_date, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(firstBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: new Prisma.Decimal(proratedSecondResidentFee.toFixed(2)),
            type: BillType.GENERATED
        });
    }

    // Add deposit to first bill if exists
    if (deposit) {
        firstBillItems.push({
            description: 'Deposit Kamar',
            amount: deposit.amount,
            type: BillType.CREATED,
            related_id: { deposit_id: null } // Will be updated when deposit is created
        });
    }

    bills.push({
        description: `Tagihan untuk Bulan ${format(start_date, 'MMMM yyyy', { locale: indonesianLocale })}`,
        due_date: firstBillEndDate,
        bill_item: {
            create: firstBillItems
        }
    });

    // Second bill (full month)
    const secondBillStartDate = startOfMonth(new Date(start_date.getFullYear(), start_date.getMonth() + 1, 1));
    const secondBillEndDate = endOfMonth(secondBillStartDate);

    const secondBillItems = [{
        description: `Sewa Kamar (${format(secondBillStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(secondBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
        amount: fee,
        type: BillType.GENERATED
    }];

    // Add second resident fee if exists
    if (second_resident_fee) {
        secondBillItems.push({
            description: `Biaya Penghuni Kedua (${format(secondBillStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(secondBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: second_resident_fee,
            type: BillType.GENERATED
        });
    }

    bills.push({
        description: `Tagihan untuk Bulan ${format(secondBillStartDate, 'MMMM yyyy', { locale: indonesianLocale })}`,
        due_date: secondBillEndDate,
        bill_item: {
            create: secondBillItems
        }
    });

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
    addOns?: Pick<BookingAddOn, 'addon_id' | 'start_date' | 'end_date'>[]
}, existingBills: Bill[], date: Date): Promise<Prisma.BillCreateInput | null> {
    if (booking.end_date && date > booking.end_date) {
        return null;
    }

    if (existingBills.length === 0) {
        console.error(`Rolling booking ${booking.id} has no existing bills.`);
        return null;
    }

    const latestBill = existingBills.sort((a, b) => b.due_date.getTime() - a.due_date.getTime())[0];
    const nextBillStartDate = startOfMonth(new Date(latestBill.due_date.getFullYear(), latestBill.due_date.getMonth() + 1, 1));

    // Only generate for the current month.
    if (nextBillStartDate.getMonth() !== date.getMonth() || nextBillStartDate.getFullYear() !== date.getFullYear()) {
        return null;
    }

    const nextBillEndDate = endOfMonth(nextBillStartDate);
    const billDescription = `Tagihan untuk Bulan ${format(nextBillStartDate, 'MMMM yyyy', { locale: indonesianLocale })}`;

    const billItems = [{
        description: `Sewa Kamar (${format(nextBillStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(nextBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
        amount: booking.fee,
        type: BillType.GENERATED
    }];

    // Add second resident fee if exists
    if (booking.second_resident_fee) {
        billItems.push({
            description: `Biaya Penghuni Kedua (${format(nextBillStartDate, 'd MMMM yyyy', { locale: indonesianLocale })} - ${format(nextBillEndDate, 'd MMMM yyyy', { locale: indonesianLocale })})`,
            amount: booking.second_resident_fee,
            type: BillType.GENERATED
        });
    }

    return {
        description: billDescription,
        due_date: nextBillEndDate,
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
