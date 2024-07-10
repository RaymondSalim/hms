"use server";

import prisma from "@/app/_lib/primsa";
import {Prisma, Tenant} from "@prisma/client";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

export type TenantWithRooms = Prisma.TenantGetPayload<{
  include: {
    bookings: {
      include: {
        rooms: true
      }
    }
  }
}>;

export async function getTenants(id?: string, locationID?: number, limit?: number, offset?: number) {
  return prisma.tenant.findMany({
    where: {
      id: id,
      OR: [
        {
          bookings: {
            some: {
              rooms: {
                location_id: locationID
              }
            }
          }
        },
        {
          bookings: {
            none: {}
          }
        }
      ],
    },
    skip: offset,
    take: limit,
  });
}

export async function getTenantsWithRooms(id?: string, locationID?: number, limit?: number, offset?: number) {
  return prisma.tenant.findMany({
    where: {
      id: id,
      OR: [
        {
          bookings: {
            some: {
              rooms: {
                location_id: locationID
              }
            }
          }
        },
        {
          bookings: {
            none: {}
          }
        }
      ],
    },
    skip: offset,
    take: limit,
    include: {
      bookings: {
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

export async function createTenant(tenantData: OmitIDTypeAndTimestamp<Tenant>) {
  return prisma.tenant.create({
    data: tenantData,
    include: {
      bookings: {
        include: {
          rooms: true
        }
      }
    }
  })
}

export async function updateTenantByID(id: string, tenantData: OmitIDTypeAndTimestamp<Tenant>) {
  return prisma.tenant.update({
    data: {
      id: undefined,
      ...tenantData,
    },
    where: {id},
    include: {
      bookings: {
        include: {
          rooms: true
        }
      }
    }
  })
}

export async function deleteTenant(id: string) {
  return prisma.tenant.delete({
    where: {id},
    include: {
      bookings: {
        include: {
          rooms: true
        }
      }
    }
  })

}
