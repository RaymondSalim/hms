"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Bill, Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
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

  const {fee, check_in, duration_id, ...otherBookingData} = data;

  const bills: Partial<Bill>[] = [];
  const checkInDate = new Date(check_in);
  const duration = await prisma.duration.findUnique({
    where: {id: duration_id},
  });

  if (!duration) {
    return {
      failure: "Invalid Duration ID"
    };
  }

  const {day_count, month_count} = duration;

  if (month_count) {
    const totalMonths = month_count;
    const totalDaysInMonth = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + 1, 0).getDate();

    // Calculate prorated amount if check_in is not the first of the month
    if (checkInDate.getDate() !== 1) {
      const remainingDays = totalDaysInMonth - checkInDate.getDate() + 1;
      const dailyRate = fee / totalDaysInMonth;
      const proratedAmount = dailyRate * remainingDays;

      // Add prorated bill for the current month
      bills.push({
        amount: new Prisma.Decimal(proratedAmount.toFixed(2)),
        description: `Prorated bill for ${checkInDate.toLocaleString('default', {month: 'long'})} ${checkInDate.getDate()}-${totalDaysInMonth}`,
        due_date: new Date(checkInDate.getFullYear(), checkInDate.getMonth(), totalDaysInMonth),
      });

      // Add full monthly bills for subsequent months, except the last one
      for (let i = 1; i < totalMonths; i++) {
        const billStartDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + i, 1);
        const billEndDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });
      }

      // Add full monthly bill for the last month
      const lastMonthStartDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + totalMonths, 1);
      const lastMonthEndDate = new Date(lastMonthStartDate.getFullYear(), lastMonthStartDate.getMonth() + 1, 0);
      bills.push({
        amount: new Prisma.Decimal(fee),
        description: `Monthly bill for ${lastMonthStartDate.toLocaleString('default', {month: 'long'})} ${lastMonthStartDate.getDate()}-${lastMonthEndDate.getDate()}`,
        due_date: lastMonthEndDate,
      });

    } else {
      // Add full monthly bills for totalMonths
      for (let i = 0; i < totalMonths; i++) {
        const billStartDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + i, 1);
        const billEndDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth() + i + 1, 0);
        bills.push({
          amount: new Prisma.Decimal(fee),
          description: `Monthly bill for ${billStartDate.toLocaleString('default', {month: 'long'})} ${billStartDate.getDate()}-${billEndDate.getDate()}`,
          due_date: billEndDate,
        });
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
  //     const billDate = new Date(checkInDate);
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
  return prisma.$transaction(async (prismaTrx) => {
    // Create the booking
    const newBooking = await prismaTrx.booking.create({
      data: {
        ...otherBookingData,
        fee,
        check_in,
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
  });
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

export async function deleteBooking(id: number) {
  return prisma.booking.delete({
    where: {id},
  });
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
