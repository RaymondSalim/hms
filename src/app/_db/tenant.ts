"use server";

import prisma from "@/app/_lib/primsa";

export async function getTenants(id?: string, limit?: number, offset?: number, includeBookings = false) {
  return prisma.tenant.findMany({
    where: id ? {id: id} : undefined,
    skip: offset,
    take: limit,
    include: {
      bookings: includeBookings && {
        include: {
          rooms: true
        },
      }
    }
  });
}

export async function getTenantsWithRoomNumber(locationID?: number) {
  return prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      bookings: {
        select: {
          rooms: {
            select: {
              room_number: true
            },
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      }
    },
    where: {
      bookings: {
        every: {
          rooms: {
            location_id: locationID,
          }
        }
      }
    }
  });
}
