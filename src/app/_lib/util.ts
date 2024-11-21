import {Duration} from "@prisma/client";
import {BookingsIncludeAll} from "@/app/_db/bookings";

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

export function generateDatesFromBooking(bookings: BookingsIncludeAll, callback?: (d: Date) => void): Date[] | null {
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