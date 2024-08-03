import {Duration} from "@prisma/client";

export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToDateTime(d: Date, showTime = true): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: showTime ? "short" : undefined,
  }).format(d);
}

export type IntersectionToUnion<T> = (T extends any ? (arg: T) => void : never) extends (arg: infer U) => void ? U : never;

export function addToDate(date: Date, dayCount: number, monthCount: number) {
  date.setDate(date.getDate() + dayCount);
  date.setMonth(date.getMonth() + monthCount);
  return date;
}

export function generateDatesByDuration(checkInDate: Date, duration: Duration, callback?: (d: Date) => void): Date[] {
  const dates: Date[] = [];

  if (duration.month_count) {
    const endDate = new Date(
      checkInDate.getFullYear(),
      checkInDate.getMonth() + duration.month_count,
      checkInDate.getDate() - 1
    );

    for (let d = structuredClone(checkInDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currDate = new Date(d);
      dates.push(currDate);
      callback?.(currDate);
    }
  }

  return dates;
}

