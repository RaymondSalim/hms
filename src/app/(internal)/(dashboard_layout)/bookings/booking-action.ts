"use server";

import {OmitTimestamp} from "@/app/_db/db";
import {Bill, BillItem, CheckInOutLog, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
import {number, object} from "zod";
import {getLastDateOfBooking} from "@/app/_lib/util";
import {BookingsIncludeAll, createBooking, getAllBookings, getBookingByID, updateBookingByID} from "@/app/_db/bookings";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {updateDepositStatus} from "@/app/_db/deposit";

export type UpsertBookingPayload = OmitTimestamp<BookingsIncludeAll>

export async function upsertBookingAction(reqData: UpsertBookingPayload) {
    const {success, data, error} = bookingSchema.safeParse(reqData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    const {id, fee, start_date, duration_id, ...otherBookingData} = data;

    const duration = await prisma.duration.findUnique({
        where: {id: duration_id},
    });

    if (!duration) {
        return {
            failure: "Invalid Duration ID"
        };
    }

    // Verify that booking does not overlap
    const today = new Date();
    const lastDate = getLastDateOfBooking(start_date, duration);
    data.end_date = lastDate;

    const bookings = await prisma.booking.findMany({
        where: {
            AND: [
                {
                    start_date: {
                        gte: new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()),
                    }
                },
                {
                    room_id: otherBookingData.room_id
                }
            ],

        },
        include: {
            durations: true
        }
    });

    type BookingDates = {
        start_date: Date,
        end_date: Date
    };

    function isBookingPossible(firstBooking: BookingDates, secondBooking: BookingDates) {
        return secondBooking.start_date >= firstBooking.end_date || secondBooking.end_date <= firstBooking.start_date;
    }

    // TODO! Improvement: Divide into n-chunks then parallel
    for (let i = 0; i < bookings.length; i++) {
        let currBooking = bookings[i];
        if (!isBookingPossible(
            {
                start_date: start_date,
                end_date: lastDate,
            },
            {
                start_date: currBooking.start_date,
                end_date: currBooking.end_date
            }
        ) && currBooking.id != id) {
            return {
                failure: `Booking overlaps with booking ID: ${currBooking.id}`
            };
        }
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
            // @ts-ignore
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

export async function getBookingByIDAction<T extends Prisma.BookingInclude>(id: number, include?: T) {
    return getBookingByID(id, include);
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
