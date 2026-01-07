import {Duration} from "@prisma/client";
import {BookingsIncludeAll} from "@/app/_db/bookings";
import {generateDatesBetween} from "./datetime";

export function getLastDateOfBooking(start_date: Date, duration: Duration) {
  const startDate = structuredClone(start_date);

  if (duration.month_count) {
    if (startDate.getDate() === 1) {
      return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count, 0, startDate.getHours());
    }
    return new Date(startDate.getFullYear(), startDate.getMonth() + duration.month_count + 1, 0, startDate.getHours());
  }

  return startDate;
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

export function parseDurationString(duration: string) {
  const [value, unit] = duration.split(" ");
  switch (unit) {
    case "hari":
    case "day":
    case "days":
      return parseInt(value);
    case "bulan":
    case "month":
    case "months":
      return parseInt(value) * 30;
    case "tahun":
    case "year":
    case "years":
      return parseInt(value) * 365;
    default:
      return 0;
  }
}

export function isBookingActive(booking: {
  start_date: Date;
  end_date?: Date | null;
  is_rolling: boolean;
  bookingstatuses?: { status: string } | null;
}) {
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
  const upcomingBookings = bookings.filter((booking) => {
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

