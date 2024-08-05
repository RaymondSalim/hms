import {Booking, Duration} from "@prisma/client";

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

// TODO! Check if correct
export function generateDatesFromBooking(bookings: Booking, callback?: (d: Date) => void): Date[] {
  const dates: Date[] = [];

  for (let d = structuredClone(bookings.start_date); d <= bookings.end_date; d.setDate(d.getDate() + 1)) {
    const currDate = new Date(d);
    dates.push(currDate);
    callback?.(currDate);
  }

  return dates;
}
