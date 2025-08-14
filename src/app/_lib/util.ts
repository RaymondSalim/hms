import {Duration, Prisma, Transaction} from "@prisma/client";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {format} from "date-fns";
import {GroupedIncomeExpense, SimplifiedIncomeExpense} from "@/app/_db/dashboard";
import type {ChartData} from "chart.js";

export const delay = (time: number) => new Promise((resolve, reject) => setTimeout(resolve, time));

export function formatToIDR(amount: number) {
  if (isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatToDateTime(d: Date, showTime = true, showSeconds = true): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "medium",
    timeStyle: showTime ? (showSeconds ? "short" : "medium") : undefined,
  }).format(d);
}

export function formatToMonthYear(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long"
  }).format(d);
}

export { getDepositStatusLabel } from './enum-translations';

export type IntersectionToUnion<T> = (T extends any ? (arg: T) => void : never) extends (arg: infer U) => void ? U : never;

export function addToDate(date: Date, dayCount: number, monthCount: number) {
  if (!date) {
    return date;
  }
  const newDate = new Date(date);
  newDate.setDate(date.getDate() + dayCount);
  newDate.setMonth(date.getMonth() + monthCount);
  return newDate;
}

export function getLastDateOfBooking(start_date: Date, duration: Duration) {
  let startDate = structuredClone(start_date);

  if (duration.month_count) {
    if (startDate.getDate() == 1) {
      return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 0, startDate.getHours());
    }
    return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count + 1, 0, startDate.getHours());
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

/**
 * Generates an array of dates for a given booking.
 * For fixed-term bookings, it calculates the range based on the duration.
 * For rolling bookings without an end date, it projects availability for the next 5 years.
 * If a rolling booking has an end date, it uses that as the final date.
 * @param bookings - The booking object.
 * @param callback - An optional callback to execute for each generated date.
 * @returns An array of dates representing the booking's span, or null if it cannot be determined.
 */
export function generateDatesFromBooking(bookings: BookingsIncludeAll, callback?: (d: Date) => void): Date[] | null {
  if (bookings.is_rolling) {
    const endDate = bookings.end_date ?? new Date(new Date().setFullYear(new Date().getFullYear() + 5));
    return generateDatesBetween(bookings.start_date, endDate, callback);
  }

  if (bookings.durations) {
    const lastDate = getLastDateOfBooking(bookings.start_date, bookings.durations);
    return generateDatesBetween(bookings.start_date, lastDate, callback);
  }

  return null;
}

export async function fileToBase64(file: File): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString());
    reader.onerror = error => reject(error);
  });
}

export function base64ToFile(base64String: string, fileName: string): File {
  const arr = base64String.split(',');
  const mimeType = arr[0].match(/:(.*?);/)?.[1]; // Extract MIME type
  const byteString = atob(arr[1]); // Decode Base64 string
  let n = byteString.length;
  const uint8Array = new Uint8Array(n);

  while (n--) {
    uint8Array[n] = byteString.charCodeAt(n);
  }

  // Create a new File object using the decoded byte array
  return new File([uint8Array], fileName, { type: mimeType || 'application/octet-stream' });
}

export function generateRandomPassword(length: number) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`";
  const allChars = upper + lower + numbers + special;

  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars[randomIndex];
  }

  return password;
}

export function parseDurationString(duration: string) {
  const [value, unit] = duration.split(' ');
  switch (unit) {
    case 'hari':
    case 'day':
    case 'days':
      return parseInt(value);
    case 'bulan':
    case 'month':
    case 'months':
      return parseInt(value) * 30;
    case 'tahun':
    case 'year':
    case 'years':
      return parseInt(value) * 365;
    default:
      return 0;
  }
}

export function parsePrismaJson<T = Record<string, any>>(json: Prisma.JsonValue): T {
  return json as T;
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
 * Converts grouped income and expense transactions into total amounts.
 * @param groupedData - The grouped transaction data with arrays of transactions.
 * @returns Simplified object containing totals for income and expenses.
 */
export function convertGroupedTransactionsToTotals(
    groupedData: GroupedIncomeExpense
): SimplifiedIncomeExpense {
  const { labels, incomeData, expenseData } = groupedData;

  const totalIncomeData = incomeData.map((transactions) =>
      transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
  );

  const totalExpenseData = expenseData.map((transactions) =>
      transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
  );

  return {
    labels,
    incomeData: totalIncomeData,
    expenseData: totalExpenseData,
  };
}

/**
 * Groups transactions by category and prepares data for a Chart.js pie chart.
 * @param transactions - Array of Transaction objects
 * @returns PieChartData with category labels and corresponding amounts
 */
export function preparePieChartData(transactions: Transaction[]): ChartData<"pie", number[]> {
  const categoryGroups: Record<string, number> = transactions.reduce((acc, transaction) => {
    const category = transaction.category || "Uncategorized";
    acc[category] = (acc[category] || 0) + Number(transaction.amount);
    return acc;
  }, {} as Record<string, number>);

  const labels = Object.keys(categoryGroups);
  const data = Object.values(categoryGroups);

  return {
    labels,
    datasets: [
      {
        data,
        hoverOffset: 4
      }
    ]
  };
}

export function objectToStringArray<T extends Record<string, any>>(obj: T): string[] {
  return Object.entries(obj)
      .filter(([_, value]) => value !== undefined && value !== null) // Ignore undefined/null values
      .map(([key, value]) => `${key}:${String(value)}`);
}

export function isBookingActive(booking: { start_date: Date; end_date?: Date | null; is_rolling: boolean ;bookingstatuses?: { status: string } | null }) {
    const now = new Date(Date.now());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(booking.start_date);

    // For rolling bookings, check if start date has passed and no end date is set
    if (booking.is_rolling) {
        return startDate <= today && !booking.end_date;
    }

    // For regular bookings, check if booking is within date range
    if (!booking.end_date) {
        return false; // Regular booking without end date is not active
    }

    const endDate = new Date(booking.end_date);
    const isWithinDateRange = startDate <= today && today <= endDate;
    return isWithinDateRange;
}

export function getNextUpcomingBooking(bookings: Array<{
    id: number;
    start_date: Date;
    end_date?: Date | null;
    is_rolling?: boolean;
    tenants?: { name: string } | null;
    bookingstatuses?: { status: string } | null;
    durations?: { duration: string } | null;
}>) {
    const now = new Date(Date.now());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter for upcoming bookings
    const upcomingBookings = bookings.filter(booking => {
        const startDate = new Date(booking.start_date);
        
        // For rolling bookings, only include if they haven't started yet
        if (booking.is_rolling) {
            return startDate > today;
        }
        
        // For regular bookings, include if they start in the future
        return startDate > today;
    });

    // Sort by start date and return the earliest upcoming booking
    upcomingBookings.sort((a, b) => {
        const startDateA = new Date(a.start_date);
        const startDateB = new Date(b.start_date);
        return startDateA.getTime() - startDateB.getTime();
    });

    return upcomingBookings.length > 0 ? upcomingBookings[0] : null;
}
