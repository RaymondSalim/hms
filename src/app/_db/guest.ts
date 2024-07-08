import {Guest, Prisma} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";

export type GuestWithTenant = Prisma.GuestGetPayload<{
  include: {
    tenants: {
      include: {
        bookings: {
          include: {
            rooms: true
          }
        }
      }
    }
  }
}>

export async function getGuests(id?: number, limit?: number, offset?: number) {
  return prisma.guest.findMany({
    where: id ? {id} : undefined,
    skip: offset,
    take: limit,
    include: {
      tenants: {
        include: {
          bookings: {
            include: {
              rooms: true,
            }
          }
        }
      }
    }
  });
}

export async function createGuest(guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.create({
    data: guestData,
    include: {
      tenants: {
        include: {
          bookings: {
            include: {
              rooms: true
            }
          }
        }
      }
    }
  });
}

export async function updateGuestByID(id: number, guestData: OmitIDTypeAndTimestamp<Guest>) {
  return prisma.guest.update({
    data: {
      ...guestData,
      id: undefined
    },
    where: {id},
    include: {
      tenants: {
        include: {
          bookings: {
            include: {
              rooms: true
            }
          }
        }
      }
    }
  });
}

export async function deleteGuest(id: number) {
  return prisma.guest.delete({
    where: {id},
    include: {
      tenants: {
        include: {
          bookings: {
            include: {
              rooms: true
            }
          }
        }
      }
    }
  });
}
