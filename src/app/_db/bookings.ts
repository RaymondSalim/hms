"use server";

import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp, PartialBy} from "@/app/_db/db";
import {BillItem, BillType, Duration, Prisma} from "@prisma/client";
import {
    generateBillItemsFromBookingAddons,
    generatePaymentBillMappingFromPaymentsAndBills,
    generateRoomBillAndBillItems
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {matchBillItemsToBills} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
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
        bills,
        billItems,
        endDate
    } = await generateRoomBillAndBillItems(data, duration);

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

            // Create associated bills
            const newBills = await prismaTrx.bill.createManyAndReturn({
                data: bills.map((b) => ({
                    ...b,
                    booking_id: newBooking.id,
                })),
            });

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
                const index = newBills.indexOf(bill);
                if (billItems[index]) { // we can do this as right now, there are one billitem per bill
                    await prismaTrx.billItem.create({
                        data: {
                            ...billItems[index],
                            bill_id: bill.id,
                            type: BillType.GENERATED
                        },
                    });
                }

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
        bills,
        billItems,
        endDate
    } = await generateRoomBillAndBillItems(data, duration);

    const addonBillItems = await generateBillItemsFromBookingAddons(bookingAddons, data);

    const existingBills = await prisma.bill.findMany({
        where: {booking_id: id},
        include: {
            paymentBills: true,
            bill_item: true
        },
    });

    const staleBillItems: Map<Date, Omit<BillItem, "bill_id">[]> = new Map();
    existingBills.forEach(b => {
        const filteredBillItems = b.bill_item
            .filter(bi => bi.type != BillType.GENERATED)
            .map(bi => ({
                ...bi,
                bill_id: undefined
            }));
        if (filteredBillItems.length > 0) {
            staleBillItems.set(
                b.due_date,
                filteredBillItems
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
            const newBills = await prismaTrx.bill.createManyAndReturn({
                data: bills.map((b) => ({...b, booking_id: id})),
            });

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
                const index = newBills.indexOf(bill);
                const billItem = billItems[index];
                if (billItem) {
                    await prismaTrx.billItem.create({
                        data: {
                            ...billItem,
                            bill_id: bill.id,
                            type: BillType.GENERATED
                        },
                    });
                }

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
