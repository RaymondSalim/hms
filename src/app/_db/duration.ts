"use server";

import prisma from "@/app/_lib/primsa";
import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Duration} from "@prisma/client";

export async function getSortedDurations() {
  let durations = prisma.duration.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return durations.then(d => {
    d.sort((a, b) => a.month_count - b.month_count);
    return d;
  });
}

export async function createDuration(durationData: OmitIDTypeAndTimestamp<Duration>) {
  return prisma.duration.create({
    data: durationData,
  });
}

export async function updateDurationByID(id: number, durationData: OmitIDTypeAndTimestamp<Duration>) {
  return prisma.duration.update({
    data: {
      ...durationData,
      id: undefined
    },
    where: {id}
  });
}

export async function deleteDuration(id: number) {
  return prisma.duration.delete({
    where: {id}
  });
}
