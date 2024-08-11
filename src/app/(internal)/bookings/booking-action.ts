"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Booking, CheckInOutLog, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {bookingSchema} from "@/app/_lib/zod/booking/zod";
import {number, object} from "zod";
import {getLastDateOfBooking} from "@/app/_lib/util";
import {createBooking, getAllBookings, updateBookingByID} from "@/app/_db/bookings";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {CheckInOutType} from "@/app/(internal)/bookings/enum";

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
  action: CheckInOutType
}): Promise<GenericActionsType<CheckInOutLog>> {
  const booking = await prisma.booking.findFirst({
    where: {
      id: data.booking_id
    }
  });

  if (!booking) {
    return {
      failure: "Booking not found"
    };
  }

  return {
    success: await prisma.checkInOutLog.create({
      data: {
        tenant_id: booking.tenant_id!,
        booking_id: data.booking_id,
        event_date: new Date(),
        event_type: data.action
      },
    })
  };
}
