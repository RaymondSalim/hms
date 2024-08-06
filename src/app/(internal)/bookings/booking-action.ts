"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Bill, Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
import {number, object} from "zod";
import {getLastDateOfBooking} from "@/app/_lib/util";
import BookingInclude = Prisma.BookingInclude;

const includeAll: BookingInclude = {
  rooms: {
    include: {
      locations: true,
    }
  },
  durations: true,
  bookingstatuses: true,
  tenants: true
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
    tenants: true
  },
}>

export async function createBookingAction(reqData: OmitIDTypeAndTimestamp<Booking>) {
  const {success, data, error} = bookingSchema.safeParse(reqData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  const {fee, start_date, duration_id, ...otherBookingData} = data;

  const bills: Partial<Bill>[] = [];
  const startDate = new Date(start_date);
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
    )) {
      return {
        failure: `Booking overlaps with booking ID: ${currBooking.id}`
      };
    }
  }

  const {day_count, month_count} = duration;
  let end_date = new Date();

  if (month_count) {
    const totalMonths = month_count;
    const totalDaysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();

    // Calculate prorated amount if start_date is not the first of the month
    if (startDate.getDate() !== 1) {
      const remainingDays = totalDaysInMonth - startDate.getDate() + 1;
      const dailyRate = fee / totalDaysInMonth;
      const proratedAmount = dailyRate * remainingDays;

      // Add prorated bill for the current month
      bills.push({
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        description: `Prorated bill for ${startDate.toLocaleString('default', {month: 'long'})} ${startDate.getDate()}-${totalDaysInMonth}`,
        due_date: new Date(startDate.getFullYear(), startDate.getMonth(), totalDaysInMonth),
      });

      // Add full monthly bills for subsequent months, except the last one
      for (let i = 1; i < totalMonths; i++) {
        const billStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const billEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });
      }

      // Add full monthly bill for the last month
      const lastMonthStartDate = new Date(startDate.getFullYear(), startDate.getMonth() + totalMonths, 1);
      const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0);
      bills.push({
        amount: new Prisma.Decimal(fee),
        description: `Monthly bill for ${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()}`,
        due_date: lastMonthEndDate,
      });
      end_date = lastMonthEndDate;

    } else {
      // Add full monthly bills for totalMonths
      for (let i = 0; i < totalMonths; i++) {
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

  // TODO! Correct implementation
  // if (day_count) {
  //   const totalDays = day_count;
  //   const dailyRate = fee / 30; // Assuming 30 days in a month for daily rate calculation
  //
  //   // Generate daily bills
  //   for (let i = 0; i < totalDays; i++) {
  //     const billDate = new Date(startDate);
  //     billDate.setDate(billDate.getDate() + i);
  //
  //     bills.push({
  //       amount: new Prisma.Decimal(dailyRate.toFixed(2)),
  //       description: `Daily bill for ${billDate.toLocaleDateString()}`,
  //       due_date: billDate,
  //     });
  //   }
  // }

  // Use a transaction to ensure atomicity
  return {
    success: await prisma.$transaction(async (prismaTrx) => {
      // Create the booking
      const newBooking = await prismaTrx.booking.create({
        data: {
          ...otherBookingData,
          fee,
          start_date,
          end_date,
          duration_id,
        },
        include: includeAll,
      });

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

export async function getBookingById(id: number) {
  return prisma.booking.findUnique({
    where: {id},
  });
}

export async function getAllBookings(location_id?: number, room_id?: number, limit?: number, offset?: number) {
  return prisma.booking.findMany({
    where: {
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

export async function updateBooking(id: number, data: OmitIDTypeAndTimestamp<Booking>) {
  return prisma.booking.update({
    where: {id},
    data: data,
  });
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

export async function getBookingsByTenantId(tenant_id: string) {
  return prisma.booking.findMany({
    where: {tenant_id},
  });
}

export async function getBookingsByRoomId(room_id: number) {
  return prisma.booking.findMany({
    where: {
      room_id: room_id
    },
  });
}

