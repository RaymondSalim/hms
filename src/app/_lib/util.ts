import {Duration} from "@prisma/client";
import {BookingsIncludeAll} from "@/app/(internal)/bookings/booking-action";

export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToDateTime(d: Date, showTime = true): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: showTime ? "short" : undefined,
  }).format(d);
}

export type IntersectionToUnion<T> = (T extends any ? (arg: T) => void : never) extends (arg: infer U) => void ? U : never;

export function addToDate(date: Date, dayCount: number, monthCount: number) {
  if (date) {
    date.setDate(date.getDate() + dayCount);
    date.setMonth(date.getMonth() + monthCount);
  }
  return date;
}

export function getLastDateOfBooking(start_date: Date, duration: Duration) {
  let startDate = structuredClone(start_date);

  if (duration.month_count) {
    if (startDate.getDate() == 1) {
      return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 0);
    }
    return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count + 1, 0);
  }

  return startDate;
}

export function generateDatesBetween(d1: Date, d2: Date, callback?: (d: Date) => void): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(d1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(d2);
  endDate.setHours(0, 0, 0, 0);

  for (let d = structuredClone(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currDate = new Date(d);
    dates.push(currDate);
    callback?.(currDate);
  }

  return dates;
}

export function generateDatesFromBooking(bookings: BookingsIncludeAll, callback?: (d: Date) => void): Date[] | null {
  if (bookings.durations) {
    const lastDate = getLastDateOfBooking(bookings.start_date, bookings.durations);
    return generateDatesBetween(bookings.start_date, lastDate, callback);
  }

  return null;
}



