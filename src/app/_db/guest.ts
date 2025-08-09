"use server";

import {Guest, Prisma} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

const guestIncludeAll = {
  include: {
    booking: {
      include: {
        tenants: true
      }
    },
    GuestStay: true
  }
};

export type GuestIncludeAll = Prisma.GuestGetPayload<typeof guestIncludeAll>

export async function getGuests(id?: number, locationID?: number, limit?: number, offset?: number) {
  return prisma.guest.findMany({
    where: {
      id: id,
      booking: {
        rooms: {
          location_id: locationID
        }
      }
    },
    skip: offset,
    take: limit,
    include: guestIncludeAll.include,
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function createGuest(guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.create({
    data: guestData,
    include: guestIncludeAll.include
  });
}

export async function updateGuestByID(id: number, guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.update({
    data: {
      ...guestData,
      id: undefined
    },
    where: {id},
    include: guestIncludeAll.include
  });
}

export async function deleteGuest(id: number) {
  return prisma.guest.delete({
    where: {id},
    include: guestIncludeAll.include
  });
}
