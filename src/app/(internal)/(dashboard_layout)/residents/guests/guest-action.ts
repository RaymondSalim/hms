"use server";

import {Guest, GuestStay, Prisma} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";
import {guestSchemaWithOptionalID, guestStaySchema} from "@/app/_lib/zod/guests/zod";
import {createGuest, deleteGuest, GuestIncludeAll, updateGuestByID} from "@/app/_db/guest";
import prisma from "@/app/_lib/primsa";
import {PartialBy} from "@/app/_db/db";

// Action to update guests
export async function upsertGuestAction(guestData: Partial<Guest>): Promise<GenericActionsType<GuestIncludeAll>> {
    const {success, data, error} = guestSchemaWithOptionalID.safeParse(guestData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    try {
        let res;
        // Update
        if (data?.id) {
            res = await updateGuestByID(data.id, data);
        } else {
            res = await createGuest(data);
        }

        return {
            success: res
        };
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[register]", error.code, error.message);
            if (error.code == "P2002") {
                return {failure: "Alamat Email sudah terdaftar"};
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[register]", error.message);
        }

        return {failure: "Request unsuccessful"};
    }
}

export async function deleteGuestAction(id: string): Promise<GenericActionsType<GuestIncludeAll>> {
    const parsedData = object({id: number().positive()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return {
            errors: parsedData.error.format()
        };
    }

    try {
        let res = await deleteGuest(parsedData.data.id);
        return {
            success: res,
        };
    } catch (error) {
        console.error(error);
        return {
            failure: "Error deleting guest",
        };
    }
}


// Action to Create or Update Guest Stay
export async function upsertGuestStayAction(guestStayData: Partial<GuestStay>): Promise<GenericActionsType<any>> {
    const {success, data, error} = guestStaySchema.safeParse(guestStayData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    try {
        return await prisma.$transaction(async (prismaTrx) => {
            let guestStay;

            if (data.id) {
                // Update Guest Stay
                guestStay = await prismaTrx.guestStay.update({
                    where: {id: data.id},
                    data: {
                        guest_id: data.guest_id,
                        start_date: data.start_date,
                        end_date: data.end_date,
                        daily_fee: new Prisma.Decimal(data.daily_fee),
                    },
                    include: {
                        guest: {
                            include: {
                                booking: true
                            }
                        }
                    }
                });

                // Delete old bill items associated with this guest stay
                await prismaTrx.billItem.deleteMany({
                    where: {
                        related_id: {
                            path: ["guest_stay_id"],
                            equals: guestStay.id
                        }
                    }
                });

            } else {
                // Create New Guest Stay
                guestStay = await prismaTrx.guestStay.create({
                    data: {
                        guest_id: data.guest_id,
                        start_date: data.start_date,
                        end_date: data.end_date,
                        daily_fee: new Prisma.Decimal(data.daily_fee),
                    },
                    include: {
                        guest: {
                            include: {
                                booking: true
                            }
                        }
                    }
                });
            }

            // Generate the new bill items
            const billItemsByMonth = await generateBillItemsFromGuestStays([guestStay]);

            // Fetch existing bills for the relevant months
            const existingBills = await prismaTrx.bill.findMany({
                where: {
                    bookings: {
                        id: guestStay.guest.booking_id
                    },
                    due_date: {
                        in: Array.from(billItemsByMonth.keys()).map(monthKey => {
                            const [year, month] = monthKey.split("-").map(Number);
                            return new Date(Date.UTC(year, month + 1, 0));
                        })
                    }
                }
            });

            // Insert bill items into the correct bills
            for (const [monthKey, billItems] of Array.from(billItemsByMonth.entries())) {
                const [year, month] = monthKey.split("-").map(Number);

                // Find existing bill or create a new one
                let bill = existingBills.find(b => b.due_date.getFullYear() === year && b.due_date.getMonth() === month);

                if (!bill) {
                    bill = await prismaTrx.bill.create({
                        data: {
                            description: `Tagihan untuk ${new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}`,
                            due_date: new Date(year, month + 1, 0),
                            booking_id: guestStay.guest.booking_id
                        }
                    });
                }

                // Attach bill items to the bill
                await prismaTrx.billItem.createMany({
                    data: billItems.map(item => ({
                        bill_id: bill!.id,
                        description: item.description,
                        amount: item.amount,
                        related_id: { "guest_stay_id": guestStay.id }
                    }))
                });
            }

            return {success: guestStay};
        }, {
            timeout: 25000
        });
    } catch (error) {
        console.error("[upsertGuestStayAction]", error);
        return {failure: "Error processing guest stay."};
    }
}

// Action to Delete Guest Stay
export async function deleteGuestStayAction(id: number): Promise<GenericActionsType<GuestStay>> {
    const parsedData = object({id: number().positive()}).safeParse({id});

    if (!parsedData.success) {
        return {
            errors: parsedData.error.format()
        };
    }

    try {
        return await prisma.$transaction(async (prismaTrx) => {
            const guestStay = await prismaTrx.guestStay.findUnique({
                where: {id: parsedData.data.id},
                include: {
                    guest: {
                        include: {
                            booking: true
                        }
                    }
                }
            });

            if (!guestStay) {
                return {failure: "Guest stay not found."};
            }

            // Delete associated bill items
            await prismaTrx.billItem.deleteMany({
                where: {
                    related_id: {
                        path: ["guest_stay_id"],
                        equals: guestStay.id
                    }
                }
            });

            // Delete the guest stay record
            await prismaTrx.guestStay.delete({
                where: {id: parsedData.data.id},
            });

            return {success: guestStay};
        });
    } catch (error) {
        console.error("[deleteGuestStayAction]", error);
        return {failure: "Error deleting guest stay."};
    }
}

type GuestStayWithMonthlyFee = GuestStay & {
    total_fee: Prisma.Decimal
}

/**
 * Splits a GuestStay record into separate monthly stays and calculates the total fee for each month.
 * @param guestStay The original guest stay object
 * @returns An array of separated GuestStay objects, one per month, with the total fee for each period
 */
export async function splitGuestStayByMonth(
    guestStay: GuestStay
): Promise<GuestStayWithMonthlyFee[]> {
    const {guest_id, daily_fee} = guestStay;
    let {start_date, end_date} = guestStay;

    let stays: GuestStayWithMonthlyFee[] = [];
    let currentDate = new Date(
        Date.UTC(start_date.getUTCFullYear(), start_date.getUTCMonth(), start_date.getUTCDate())
    );

    while (currentDate < end_date) {
        const nextMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1));
        const lastDayOfMonth = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), 0));

        let segmentEndDate = lastDayOfMonth < end_date
            ? lastDayOfMonth
            : new Date(Date.UTC(end_date.getUTCFullYear(), end_date.getUTCMonth(), end_date.getUTCDate()));

        // Calculate total fee: Number of days in segment * daily_fee
        const numberOfDays = (segmentEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        const totalFee = new Prisma.Decimal(daily_fee.toNumber() * numberOfDays);

        stays.push({
            id: 0, // Temporary ID (DB will autogenerate)
            guest_id,
            start_date: new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate())),
            end_date: new Date(Date.UTC(segmentEndDate.getUTCFullYear(), segmentEndDate.getUTCMonth(), segmentEndDate.getUTCDate())),
            daily_fee,
            total_fee: totalFee, // Added total fee calculation
            createdAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())),
            updatedAt: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())),
        });

        // Move to the next month
        currentDate = new Date(Date.UTC(segmentEndDate.getUTCFullYear(), segmentEndDate.getUTCMonth() + 1, 1));
    }

    return stays;
}

export async function generateBillItemsFromGuestStays(
    guestStays: GuestStay[],
): Promise<Map<string, PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[]>> {
    const billItemsByMonth: Map<string, PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[]> = new Map();

    for (const guestStay of guestStays) {
        const splitStays = await splitGuestStayByMonth(guestStay); // Splitting stays into monthly segments

        for (const stay of splitStays) {
            const stayStartDate = new Date(stay.start_date);
            const stayEndDate = new Date(stay.end_date);

            const totalMonths = Math.ceil(
                (stayEndDate.getFullYear() - stayStartDate.getFullYear()) * 12 +
                stayEndDate.getMonth() -
                stayStartDate.getMonth() +
                1
            );

            for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
                const billStartDate = new Date(
                    stayStartDate.getFullYear(),
                    stayStartDate.getMonth() + monthIndex,
                    monthIndex == 0 ? stayStartDate.getDate() : 1
                );

                const billEndDate = new Date(
                    billStartDate.getFullYear(),
                    billStartDate.getMonth() + 1,
                    0
                );

                // Ensure we don't go past the guest stay end date
                if (billEndDate > stayEndDate) {
                    billEndDate.setDate(stayEndDate.getDate());
                }

                const monthKey = `${billStartDate.getFullYear()}-${billStartDate.getMonth()}`;

                if (!billItemsByMonth.has(monthKey)) {
                    billItemsByMonth.set(monthKey, []);
                }

                billItemsByMonth.get(monthKey)!.push({
                    description: `Biaya Menginap Tamu Tambahan (${billStartDate.toLocaleString(
                        "default",
                        {month: "long"}
                    )} ${billStartDate.getDate()} - ${billEndDate.toLocaleString("default", {
                        month: "long",
                    })} ${billEndDate.getDate()})`,
                    amount: stay.total_fee, // This comes from the `splitGuestStayByMonth` function
                });
            }
        }
    }

    return billItemsByMonth;
}