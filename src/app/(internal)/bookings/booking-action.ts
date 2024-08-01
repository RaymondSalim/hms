"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Booking, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
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

export async function createBooking(data: OmitIDTypeAndTimestamp<Booking>) {
  return prisma.booking.create({
    data: data,
    include: includeAll
  });
}

export async function getBookingById(id: number) {
  return prisma.booking.findUnique({
    where: {id},
  });
}

export async function getAllBookings(location_id?: number, limit?: number, offset?: number) {
  return prisma.booking.findMany({
    where: {
      rooms: {
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
