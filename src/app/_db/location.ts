"use server";

import {Location, Prisma} from "@prisma/client";
import {OmitIDTypeAndTimestamp, OmitTimestamp, PartialBy} from "@/app/_db/db";
import prisma from "@/app/_lib/primsa";
import LocationInclude = Prisma.LocationInclude;

const includeCount: LocationInclude = {
  _count: true,
};

export type LocationIncludeCount = Prisma.LocationGetPayload<{
  include: typeof includeCount
}>;

export async function getLocations(id?: number, limit?: number, offset?: number) {
  return prisma.location.findMany({
    where: {
      id: id
    },
    skip: offset,
    take: limit
  });
}

export async function createLocation(locationData: OmitIDTypeAndTimestamp<Location>) {
  return prisma.location.create({
    data: {
      name: locationData.name,
      address: locationData.address,
    }
  });
}

export async function updateLocationByID(id: number, locationData: OmitIDTypeAndTimestamp<Location>) {
  return prisma.location.update({
    data: {
      name: locationData.name,
      address: locationData.address,
    },
    where: {
      id: id
    }
  });
}

export async function upsertLocation(location: PartialBy<OmitTimestamp<Location>, "id">) {
  return prisma.location.upsert({
    where: {
      id: location.id || 0,
    },
    update: {
      id: undefined,
      ...location
    },
    create: {
      id: undefined,
      ...location
    }
  });
}

export async function deleteLocation(id: number) {
  return prisma.location.delete({
    where: {
      id: id
    }
  });
}

export async function getLocationById(id: number) {
  return prisma.location.findUnique({
    where: { id },
  });
}

export async function getAllLocations(limit?: number, offset?: number, include?: LocationInclude) {
  return prisma.location.findMany({
    skip: offset,
    take: limit,
    orderBy: {
      id: 'asc'
    },
    include: include
  });
}
