"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
import {number, object} from "zod";
import {getLastDateOfBooking} from "@/app/_lib/util";
import {createBooking, updateBookingByID} from "@/app/_db/bookings";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
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

export async function upsertBookingAction(reqData: OmitIDTypeAndTimestamp<Booking>) {
  const {success, data, error} = bookingSchema.safeParse(reqData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  const {fee, start_date, duration_id, ...otherBookingData} = data;

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
    )) {
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
      success: res
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

