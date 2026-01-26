import {format} from "date-fns";

export function formatToDateTime(d: Date, showTime = true, showSeconds = true): string {
  return new Intl.DateTimeFormat("id", {
    dateStyle: "medium",
    timeStyle: showTime ? (showSeconds ? "short" : "medium") : undefined,
  }).format(d);
}

export function formatToMonthYear(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
  }).format(d);
}

export function addToDate(date: Date, dayCount: number, monthCount: number) {
  if (!date) {
    return date;
  }
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + dayCount);
  newDate.setMonth(date.getMonth() + monthCount);
  return newDate;
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

export function getDatesInRange(start: Date, end: Date, groupBy: "day" | string = "day"): string[] {
  const dates: string[] = [];
  let current = new Date(start);
  const dateFormat = groupBy === "day" ? "dd-MM-yyyy" : "MMM yyyy";
  while (current <= end) {
    dates.push(format(current, dateFormat));
    if (groupBy === "day") {
      current.setDate(current.getDate() + 1);
    } else {
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
  }
  return dates;
}

/**
 * Counts months where:
 * - First partial month does NOT count
 * - Last month ALWAYS counts
 * - Order-independent
 */
export function countMonths(start: Date, end: Date): number {
  let s = start;
  let e = end;

  if (s > e) {
    [s, e] = [e, s];
  }

  const startYear = s.getFullYear();
  const startMonth = s.getMonth();
  const startDay = s.getDate();

  const endYear = e.getFullYear();
  const endMonth = e.getMonth();

  // Base calendar difference INCLUDING end month
  let months =
      (endYear - startYear) * 12 +
      (endMonth - startMonth) +
      1;

  // If first month is partial, subtract it
  if (startDay !== 1) {
    months -= 1;
  }

  return Math.max(0, months);
}
