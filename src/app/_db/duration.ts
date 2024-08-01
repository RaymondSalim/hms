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

  const parseDuration = (duration: string): number => {
    const [value, unit] = duration.split(' ');
    switch (unit) {
      case 'day':
      case 'days':
        return parseInt(value);
      case 'month':
      case 'months':
        return parseInt(value) * 30;
      case 'year':
      case 'years':
        return parseInt(value) * 365;
      default:
        return 0;
    }
  };

  return durations.then(d => {
    d.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
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
