"use server";

import {MaintenanceTask, Prisma} from "@prisma/client";
import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";

export async function getMaintenanceTasks(id?: number, locationID?: number, limit?: number, offset?: number) {
  return prisma.maintenanceTask.findMany({
    where: {
      id: id,
      location_id: locationID,
    },
    include: {
      rooms: true,
      locations: true,
    },
    skip: offset,
    take: limit,
  });
}

export async function createMaintenanceTask(data: OmitIDTypeAndTimestamp<MaintenanceTask>) {
  return prisma.maintenanceTask.create({
    data: {
      ...data,
      id: undefined,
    },
    include: {
      rooms: true,
      locations: true,
    },
  });
}

export async function updateMaintenanceTaskByID(id: number, data: OmitIDTypeAndTimestamp<MaintenanceTask>) {
  return prisma.maintenanceTask.update({
    where: { id },
    data: {
      ...data,
      id: undefined,
    },
    include: {
      rooms: true,
      locations: true,
    },
  });
}

export async function deleteMaintenanceTask(id: number) {
  return prisma.maintenanceTask.delete({
    where: { id },
    include: {
      rooms: true,
      locations: true,
    },
  });
}

export async function getMaintenanceTaskById(id: number) {
  return prisma.maintenanceTask.findUnique({
    where: { id },
  });
}
