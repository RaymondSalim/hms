"use server";

import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp, PartialBy} from "@/app/_db/db";
import {Bill, Duration, Prisma} from "@prisma/client";
import {
    generateBillItemsFromBookingAddons,
    generatePaymentBillMappingFromPaymentsAndBills
} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import BookingInclude = Prisma.BookingInclude;
import BillItemUncheckedCreateInput = Prisma.BillItemUncheckedCreateInput;
import BillUncheckedCreateInput = Prisma.BillUncheckedCreateInput;

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

// TODO! Create/Update bookings, should also create bill item for booking addon

export async function getBookingStatuses() {
    return prisma.bookingStatus.findMany({
        orderBy: {
            createdAt: "asc",
        }
    });
}

export async function createBooking(data: OmitIDTypeAndTimestamp<BookingsIncludeAll>, duration: Duration) {
    const {fee, addOns: bookingAddons, deposit} = data;
    const startDate = new Date(data.start_date);
    let end_date = new Date();

    const bills: Partial<Bill>[] = [];
    const billItems: PartialBy<BillItemUncheckedCreateInput, "bill_id">[] = [];

    if (duration.month_count) {
        const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

        // Calculate prorated amount if start_date is not the first of the month
        if (startDate.getDate() !== 1) {
            const remainingDays = totalDaysInMonth - startDate.getDate() + 1;

            const dailyRoomRate = Number(fee) / totalDaysInMonth;
            const proratedRoomRate = dailyRoomRate * remainingDays;

            bills.push({
                description: `Tagihan untuk Bulan ${startDate.toLocaleString('default', {month: 'long'})}`,
                due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth, startDate.getHours()),
            });
            billItems.push({
                amount: new Prisma.Decimal(Math.round(proratedRoomRate)),
                description: `Biaya Sewa Kamar (${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth})`,
            });

            // Add full monthly bills for subsequent months, except the last one
            for (let i = 1; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());

                billItems.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar (${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`,
                });
                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {month: 'long'})}`,
                    due_date: billEndDate,
                });
            }

            // Add full monthly bill for the last month
            const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 1, startDate.getHours());
            const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0, startDate.getHours());
            billItems.push({
                amount: new Prisma.Decimal(fee),
                description: `Biaya Sewa Kamar (${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()})`,
            });
            bills.push({
                description: `Tagihan untuk Bulan ${lastMonthStartDate.toLocaleString('default', {month: 'long'})}`,
                due_date: lastMonthEndDate,
            });
            end_date = lastMonthEndDate;

        } else {
            // Add full monthly bills for totalMonths
            for (let i = 0; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());
                billItems.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar (${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`,
                });
                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {month: 'long'})}`,
                    due_date: billEndDate,
                });

                end_date = billEndDate;
            }
        }
    }

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
                    end_date,
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
                // @ts-expect-error description type error
                data: bills.map((b) => ({
                    ...b,
                    booking_id: newBooking.id,
                    amount: 0, // TODO! Drop
                })),
            });

            // Add Bill Item for deposit
            if (deposit) {
                await prismaTrx.billItem.create({
                    data: {
                        bill_id: newBills[0].id,
                        amount: deposit,
                        description: "Deposit Kamar"
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
                        },
                    });
                }

                const addonKey = `${bill.due_date.getFullYear()}-${bill.due_date.getMonth()}`;

                if (addonBillItems?.has(addonKey)) {
                    const addonBills = addonBillItems.get(addonKey);

                    if (addonBills) {
                        await prismaTrx.billItem.createMany({
                            data: addonBills.map(ab => ({...ab, bill_id: bill.id}))
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

// TODO! Check if update booking actually updates bookings, or just bills
export async function updateBookingByID(id: number, data: OmitIDTypeAndTimestamp<BookingsIncludeAll>, duration: Duration) {
    const {addOns: bookingAddons, ...otherData} = data;
    const existingBooking = await prisma.booking.findFirst({
        where: {id},
    });

    if (!existingBooking) {
        return {
            failure: "Booking not found"
        };
    }

    const {fee} = data;
    const startDate = new Date(data.start_date);
    let end_date = new Date();

    const bills: PartialBy<BillUncheckedCreateInput, "id" | "amount" | "booking_id">[] = [];
    const billItems: PartialBy<BillItemUncheckedCreateInput, "bill_id">[] = [];

    if (duration.month_count) {
        const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

        // Calculate prorated amount if start_date is not the first of the month
        if (startDate.getDate() !== 1) {
            const remainingDays = totalDaysInMonth - startDate.getDate() + 1;
            const dailyRate = Number(fee) / totalDaysInMonth;
            const proratedAmount = dailyRate * remainingDays;

            bills.push({
                description: `Tagihan untuk Bulan ${startDate.toLocaleString('default', {month: 'long'})}`,
                due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth, startDate.getHours())
            });
            billItems.push({
                amount: new Prisma.Decimal(Math.round(proratedAmount)),
                description: `Biaya Sewa Kamar (${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth})`,
            });

            // Add full monthly bills for subsequent months, except the last one
            for (let i = 1; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());

                billItems.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar (${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`,
                });
                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {month: 'long'})}`,
                    due_date: billEndDate,
                });
            }

            // Add full monthly bill for the last month
            const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 1, startDate.getHours());
            const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0, startDate.getHours());
            billItems.push({
                amount: new Prisma.Decimal(fee),
                description: `Biaya Sewa Kamar (${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()})`,
            });
            bills.push({
                description: `Tagihan untuk Bulan ${lastMonthStartDate.toLocaleString('default', {month: 'long'})}`,
                due_date: lastMonthEndDate,
            });
            end_date = lastMonthEndDate;

        } else {
            // Add full monthly bills for totalMonths
            for (let i = 0; i < duration.month_count; i++) {
                const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, startDate.getHours());
                const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, startDate.getHours());

                billItems.push({
                    amount: new Prisma.Decimal(fee),
                    description: `Biaya Sewa Kamar (${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()})`,
                });
                bills.push({
                    description: `Tagihan untuk Bulan ${billStartDate.toLocaleString('default', {month: 'long'})}`,
                    due_date: billEndDate,
                });

                end_date = billEndDate;
            }
        }
    }

    const addonBillItems = await generateBillItemsFromBookingAddons(bookingAddons, data);

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
            const existingBills = await prismaTrx.bill.findMany({
                where: {booking_id: id},
                include: {paymentBills: true},
            });
            const existingPaymentBillIDs = existingBills.flatMap((bill) => bill.paymentBills.map((pb) => pb.id));
            await prismaTrx.paymentBill.deleteMany({
                where: {id: {in: existingPaymentBillIDs}},
            });
            await prismaTrx.bill.deleteMany({
                where: {booking_id: id},
            });

            // Create new Bills and BillItems
            const newBills = await prismaTrx.bill.createManyAndReturn({
                data: bills.map((b) => ({...b, booking_id: id, amount: 0})),
            });

            // Add Bill Item for deposit
            if (otherData.deposit) {
                await prismaTrx.billItem.create({
                    data: {
                        bill_id: newBills[0].id,
                        amount: otherData.deposit,
                        description: "Deposit Kamar"
                    }
                });
            }

            for (const bill of newBills) {
                const index = newBills.indexOf(bill);
                const billItem = billItems[index];
                if (billItem) {
                    await prismaTrx.billItem.create({
                        data: {...billItem, bill_id: bill.id},
                    });
                }

                const addonKey = `${bill.due_date.getFullYear()}-${bill.due_date.getMonth()}`;

                if (addonBillItems.has(addonKey)) {
                    const addonBills = addonBillItems.get(addonKey);

                    if (addonBills) {
                        await prismaTrx.billItem.createMany({
                            data: addonBills.map(ab => ({...ab, bill_id: bill.id}))
                        });
                    }
                }
            }

            // Sync paymentBills using the utility function
            const existingPayments = await prismaTrx.payment.findMany({
                where: {booking_id: id},
            });

            let generatedPaymentBills = await generatePaymentBillMappingFromPaymentsAndBills(existingPayments, newBills);
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
                    end_date,
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
