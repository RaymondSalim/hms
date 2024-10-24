"use server";

import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Bill, Booking, Duration, Prisma} from "@prisma/client";
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
  checkInOutLogs: true
};

export type BookingsIncludeAll = Prisma.BookingGetPayload<{
  include: {
    rooms: {
      include: {
        locations: true,
      }
    },
    durations: true,
    bookingstatuses: true,
    tenants: true,
    checkInOutLogs: true
  },
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

export async function createBooking(data: OmitIDTypeAndTimestamp<Booking>, duration: Duration) {
  const {fee, ...otherBookingData} = data;
  const startDate = new Date(data.start_date);
  let end_date = new Date();

  const bills: Partial<Bill>[] = [];

  if (duration.month_count) {
    const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

    // Calculate prorated amount if start_date is not the first of the month
    if (startDate.getDate() !== 1) {
      const remainingDays = totalDaysInMonth - startDate.getDate() + 1;
      const dailyRate = Number(fee) / totalDaysInMonth;
      const proratedAmount = dailyRate * remainingDays;

      // Add prorated bill for the current month
      bills.push({
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        description: `Tagihan prorata untuk ${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth}`,
        due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth),
      });

      // Add full monthly bills for subsequent months, except the last one
      for (let i = 1; i < duration.month_count; i++) {
        const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Tagihan bulanan untuk ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });
      }

      // Add full monthly bill for the last month
      const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 1);
      const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0);
      bills.push({
        amount: new Prisma.Decimal(fee),
        description: `Monthly bill for ${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()}`,
        due_date: lastMonthEndDate,
      });
      end_date = lastMonthEndDate;

    } else {
      // Add full monthly bills for totalMonths
      for (let i = 0; i < duration.month_count; i++) {
        const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });

        end_date = billEndDate;
      }
    }
  }

  // Use a transaction to ensure atomicity
  return {
    success: await prisma.$transaction(async (prismaTrx) => {
      // Create the booking
      const newBooking = await prismaTrx.booking.create({
        data: {
          ...otherBookingData,
          durations: undefined,
          rooms: undefined,
          bookingstatuses: undefined,
          tenants: undefined,
          fee,
          end_date,
        },
        include: includeAll,
      })
        .then(nb => ({
          ...nb,
          custom_id: `#-${nb.id}`
        }));

      // Create associated bills
      for (const billData of bills) {
        await prismaTrx.bill.create({
          // @ts-ignore
          data: {
            ...billData,
            booking_id: newBooking.id,
          },
        });
      }

      return newBooking;
    })
  };
}

// TODO! Check if update booking actually updates bookings, or just bills
export async function updateBookingByID(id: number, data: OmitIDTypeAndTimestamp<Booking>, duration: Duration) {
  const {fee, ...otherBookingData} = data;
  const startDate = new Date(data.start_date);
  let end_date = new Date();

  const bills: Partial<Bill>[] = [];

  if (duration.month_count) {
    const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

    // Calculate prorated amount if start_date is not the first of the month
    if (startDate.getDate() !== 1) {
      const remainingDays = totalDaysInMonth - startDate.getDate() + 1;
      const dailyRate = Number(fee) / totalDaysInMonth;
      const proratedAmount = dailyRate * remainingDays;

      // Add prorated bill for the current month
      bills.push({
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        description: `Prorated bill for ${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth}`,
        due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth),
      });

      // Add full monthly bills for subsequent months, except the last one
      for (let i = 1; i < duration.month_count; i++) {
        const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });
      }

      // Add full monthly bill for the last month
      const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 1);
      const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0);
      bills.push({
        amount: new Prisma.Decimal(fee),
        description: `Monthly bill for ${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()}`,
        due_date: lastMonthEndDate,
      });
      end_date = lastMonthEndDate;

    } else {
      // Add full monthly bills for totalMonths
      for (let i = 0; i < duration.month_count; i++) {
        const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });

        end_date = billEndDate;
      }
    }
  }

  return {
    success: await prisma.$transaction(async (prismaTrx) => {
      // Get Booking
      const existingBooking = await prismaTrx.booking.findFirst({
        where: {
          id: id
        }
      });

      if (existingBooking) {
        // Delete existing bills
        await prismaTrx.bill.deleteMany({
          where: {
            bookings: {
              id: existingBooking.id
            }
          }
        });

        // Create associated bills
        for (const billData of bills) {
          await prismaTrx.bill.create({
            // @ts-ignore
            data: {
              ...billData,
              booking_id: existingBooking.id,
            },
          });
        }
      }
    })
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
