import {OmitIDType} from "@/app/_db/db";
import {Booking} from "@prisma/client";

export async function createBooking(data: OmitIDType<Booking>) {
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

export async function updateBooking(id: number, data: OmitIDType<Booking>) {
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

export async function getBookingsByUserId(user_id: string) {
  return prisma.booking.findMany({
    where: {user_id},
  });
}

export async function getBookingsByRoomId(room_id: number) {
  return prisma.booking.findMany({
    where: {
      room_id: room_id
    },
  });
}
