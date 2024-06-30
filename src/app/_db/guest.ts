import {Guest} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export async function getGuests(id?: number, limit?: number, offset?: number) {
  return prisma.guest.findMany({
    where: id ? {id} : undefined,
    skip: offset,
    take: limit,
  });
}

export async function createGuest(guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.create({
    data: guestData,
  });
}

export async function updateGuestByID(id: number, guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.update({
    data: guestData,
    where: {id},
  });
}

export async function deleteGuest(id: number) {
  return prisma.guest.delete({
    where: {id},
  });
}
