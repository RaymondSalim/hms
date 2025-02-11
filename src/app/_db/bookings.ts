"use server";

import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp, PartialBy} from "@/app/_db/db";
import {BillItem, BillType, Duration, Prisma} from "@prisma/client";
import {
    generateBillItemsFromBookingAddons,
    generateBookingBillandBillItems,
    generatePaymentBillMappingFromPaymentsAndBills
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {matchBillItemsToBills} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {BillIncludeBillItem} from "@/app/_db/bills";
import BookingInclude = Prisma.BookingInclude;

const includeAll: BookingInclude = {
    rooms: {
        include: {
            locations: true,
        }
    },
    durations: true,
    bookingstatuses: true,
    tenants: true,
    checkInOutLogs: true,
    addOns: true,
};

export type BookingsIncludeAll = Prisma.BookingGetPayload<{
    include: typeof includeAll
}> & {
    custom_id: string
}

export type BookingsIncludeAddons = Prisma.BookingGetPayload<{
    include: {
        addOns: true
    }
}> & {
    custom_id: string
}

export async function getBookingStatuses() {
    return prisma.bookingStatus.findMany({
        orderBy: {
            createdAt: "asc",
        }
    });
}

export async function createBooking(data: OmitIDTypeAndTimestamp<BookingsIncludeAll>, duration: Duration) {
    const {fee, addOns: bookingAddons, deposit} = data;

    const {
        billsWithBillItems,
        billItems,
        endDate
    } = await generateBookingBillandBillItems(data, duration);

    let addonBillItems: Map<string, PartialBy<Prisma.BillItemUncheckedCreateInput, "bill_id">[]> | undefined;
    if (bookingAddons) {
        addonBillItems = await generateBillItemsFromBookingAddons(bookingAddons, data);
    }

    return {
        success: await prisma.$transaction(async (prismaTrx) => {
            const newBooking = await prismaTrx.booking.create({
                data: {
                    fee,
                    start_date: data.start_date,
                    end_date: endDate,
                    second_resident_fee: data.second_resident_fee,
                    deposit,
                    rooms: {
                        connect: {
                            id: data.room_id!
                        }
                    },
                    tenants: {
                        connect: {
                            id: data.tenant_id!
                        }
                    },
                    durations: {
                        connect: {
                            id: data.duration_id!
                        }
                    },
                    bookingstatuses: {
                        connect: {
                            id: data.status_id!
                        }
                    }
                },
            });

            const newBills: BillIncludeBillItem[] = [];
            for (const bill of billsWithBillItems) {
                newBills.push(
                    await prismaTrx.bill.create({
                        data: {
                            ...bill,
                            booking_id: newBooking.id,
                        },
                        include: {
                            bill_item: true
                        }
                    })
                );
            }

            // Add Bill Item for deposit
            if (deposit) {
                await prismaTrx.billItem.create({
                    data: {
                        bill_id: newBills[0].id,
                        amount: deposit,
                        description: "Deposit Kamar",
                        type: BillType.GENERATED
                    }
                });
            }

            for (const bill of newBills) {
                const addonKey = `${bill.due_date.getFullYear()}-${bill.due_date.getMonth()}`;

                if (addonBillItems?.has(addonKey)) {
                    const addonBills = addonBillItems.get(addonKey);

                    if (addonBills) {
                        await prismaTrx.billItem.createMany({
                            data: addonBills.map(ab => ({
                                ...ab,
                                bill_id: bill.id,
                                type: BillType.GENERATED
                            }))
                        });
                    }
                }
            }

            // Create associated BookingAddOns
            if (bookingAddons) {
                await prismaTrx.bookingAddOn.createMany({
                    data: bookingAddons.map(na => ({...na, booking_id: newBooking.id}))
                });
            }

            return prismaTrx.booking.findFirst({
                where: {id: newBooking.id},
                include: includeAll
            });
        })
    };
}

export async function updateBookingByID(id: number, data: OmitIDTypeAndTimestamp<BookingsIncludeAll>, duration: Duration) {
    const {fee, addOns: bookingAddons, ...otherData} = data;
    const existingBooking = await prisma.booking.findFirst({
        where: {id},
    });

    if (!existingBooking) {
        return {
            failure: "Booking not found"
        };
    }

    const {
        billsWithBillItems,
        billItems,
        endDate
    } = await generateBookingBillandBillItems(data, duration);

    const addonBillItems = await generateBillItemsFromBookingAddons(bookingAddons, data);

    const existingBills = await prisma.bill.findMany({
        where: {booking_id: id},
        include: {
            paymentBills: true,
            bill_item: true
        },
    });

    const staleBillItems: Map<Date, Omit<BillItem, "bill_id">[]> = new Map();
    existingBills.forEach((b: BillIncludeBillItem) => {
        const generatedBillItems = b.bill_item
            .filter((bi: BillItem) => bi.type != BillType.GENERATED)
            .map((bi: BillItem) => ({
                ...bi,
                bill_id: undefined
            }));
        if (generatedBillItems.length > 0) {
            staleBillItems.set(
                b.due_date,
                generatedBillItems
            );
        }

        const tamuBillItems = b.bill_item
            .filter((bi: BillItem) => {
                let a = Prisma.parseJson(bi.related_id);
                return a && a.hasOwnProperty("guest_stay_id");
            })
            .map((bi: BillItem) => ({
                ...bi,
                bill_id: undefined
            }));
        if (tamuBillItems.length > 0) {
            staleBillItems.set(
                b.due_date,
                tamuBillItems
            );
        }
    });


    return {
        success: await prisma.$transaction(async (prismaTrx) => {
            // Update existing addOns
            const existingAddOns = await prismaTrx.bookingAddOn.findMany({
                where: {booking_id: id},
            });

            const newAddOns = bookingAddons?.filter((addon) => !addon.id) || [];
            const updateAddOns = bookingAddons?.filter((addon) =>
                existingAddOns.some((ea) => ea.id === addon.id)
            ) || [];
            const deleteAddOnIDs = existingAddOns
                .filter((ea) => !bookingAddons?.some((addon) => addon.id === ea.id))
                .map((ea) => ea.id);

            // Delete unused AddOns
            await prismaTrx.bookingAddOn.deleteMany({
                where: {id: {in: deleteAddOnIDs}},
            });

            // Update existing addOns
            for (const addon of updateAddOns) {
                await prismaTrx.bookingAddOn.update({
                    where: {id: addon.id},
                    data: addon,
                });
            }

            // Create new AddOns
            await prismaTrx.bookingAddOn.createMany({
                data: newAddOns.map((na) => ({...na, booking_id: id})),
            });

            // Delete existing Bills, BillItems, and PaymentBills
            const existingPaymentBillIDs = existingBills.flatMap((bill) => bill.paymentBills.map((pb) => pb.id));
            await prismaTrx.paymentBill.deleteMany({
                where: {id: {in: existingPaymentBillIDs}},
            });
            await prismaTrx.bill.deleteMany({
                where: {booking_id: id},
            });

            // Create new Bills and BillItems
            const newBills: BillIncludeBillItem[] = [];
            for (const billItem of billsWithBillItems) {
                newBills.push(
                    await prismaTrx.bill.create({
                        data: {
                            ...billItem,
                            booking_id: id,
                        },
                        include: {
                            bill_item: true
                        }
                    })
                );
            }

            // Add Bill Item for deposit
            if (otherData.deposit) {
                await prismaTrx.billItem.create({
                    data: {
                        bill_id: newBills[0].id,
                        amount: otherData.deposit,
                        description: "Deposit Kamar",
                        type: BillType.GENERATED
                    }
                });
            }

            for (const bill of newBills) {
                const addonKey = `${bill.due_date.getFullYear()}-${bill.due_date.getMonth()}`;

                if (addonBillItems.has(addonKey)) {
                    const addonBills = addonBillItems.get(addonKey);

                    if (addonBills) {
                        await prismaTrx.billItem.createMany({
                            data: addonBills.map(ab => ({
                                ...ab,
                                bill_id: bill.id,
                                type: BillType.GENERATED
                            }))
                        });
                    }
                }
            }

            // Recreate Bill Items of type: CREATED
            const billItemMapping = await matchBillItemsToBills(staleBillItems, newBills);
            const newBillItems = Array.from(billItemMapping.entries())
                .flatMap(([bill_id, billItems]) => {
                    return billItems.map(bi => ({
                        ...bi,
                        bill_id: bill_id,
                        related_id: bi.related_id ?? Prisma.DbNull
                    }));
                });

            await prismaTrx.billItem.createMany({
                data: newBillItems,
            });

            // Sync paymentBills using the utility function
            const existingPayments = await prismaTrx.payment.findMany({
                where: {booking_id: id},
            });

            const createdBills = await prismaTrx.bill.findMany({
                where: {
                    id: {
                        in: newBills.map(nb => nb.id)
                    },
                },
                include: {
                    bill_item: true
                }
            });

            let generatedPaymentBills = await generatePaymentBillMappingFromPaymentsAndBills(existingPayments, createdBills);
            await prismaTrx.paymentBill.createManyAndReturn({
                data: [
                    ...generatedPaymentBills
                ]
            });

            // Update the booking
            return prismaTrx.booking.update({
                where: {id},
                data: {
                    fee,
                    start_date: data.start_date,
                    end_date: endDate,
                    deposit: data.deposit,
                    second_resident_fee: data.second_resident_fee,
                    rooms: {
                        connect: {
                            id: data.room_id!
                        }
                    },
                    tenants: {
                        connect: {
                            id: data.tenant_id!
                        }
                    },
                    durations: {
                        connect: {
                            id: data.duration_id!
                        }
                    },
                    bookingstatuses: {
                        connect: {
                            id: data.status_id!
                        }
                    }
                },
                include: includeAll
            });
        }, {timeout: 25000})
    };
}

export async function getAllBookings(location_id?: number, room_id?: number, where?: Prisma.BookingWhereInput, limit?: number, offset?: number) {
    return prisma.booking.findMany({
        where: {
            ...where,
            rooms: {
                id: room_id,
                location_id: location_id,
            }
        },
        skip: offset,
        take: limit,
        include: includeAll
    });
}

export async function getBookingByID<T extends Prisma.BookingInclude>(id: number, include?: T) {
    return prisma.booking.findFirst<{
        where: { id: number }
        include: T | undefined,
    }>({
        include: include,
        where: {
            id
        },
    });
}
