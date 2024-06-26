import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Booking} from "@prisma/client";
import prisma from "@/app/_lib/primsa";

export async function createBooking(data: OmitIDTypeAndTimestamp<Booking>) {
  return prisma.booking.create({
    data: data
  });
}

export async function getBookingById(id: number) {
  return prisma.booking.findUnique({
    where: {id},
  });
}

export async function getAllBookings(limit?: number, offset?: number) {
  return prisma.booking.findMany({
    skip: offset,
    take: limit
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
