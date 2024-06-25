"use server";

import {Prisma} from "@prisma/client";
import {format} from "date-fns";

export async function getOverviewData(locationID?: number) {
  const firstDateOfWeek = getFirstDateOfWeek(new Date());
  const lastDateOfWeek = getLastDateOfWeek(new Date());

  const checkIn = prisma.booking.count({
    where: {
      rooms: {
        location_id: locationID
      },
      check_in: {
        gte: firstDateOfWeek,
        lt: lastDateOfWeek,
      }
    }
  });

  const locationClause = locationID ? Prisma.sql`r.location_id = ${locationID}` : Prisma.sql`TRUE`;
  const bookingsCountRaw = prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::integer AS COUNT
      FROM "bookings" b
               LEFT JOIN durations d ON b.duration_id = d.id
               LEFT JOIN rooms r ON b.room_id = r.id
      WHERE ${locationClause}
        AND (
          b.check_in + INTERVAL '1 DAY' * d.day_count + INTERVAL '1 MONTH' * COALESCE(d.month_count, 0)
          ) BETWEEN ${firstDateOfWeek} AND ${lastDateOfWeek}
  `;
  // const bookingsCount: Promise<number> = bookingsCountRaw.then(e => new Promise(resolve => setTimeout(() => resolve(e[0].count), 10000)));
  const bookingsCount = bookingsCountRaw.then(e => e[0].count);

  const availableCount = prisma.room.count({
    where: {
      roomstatuses: {
        id: 1,
      }
    }
  });

  const occupiedCount = prisma.room.count({
    where: {
      roomstatuses: {
        id: 2,
      }
    }
  });

  return {
    check_in: checkIn,
    check_out: bookingsCount,
    available: availableCount,
    occupied: occupiedCount,
    date_range: {
      start: formatDateToString(firstDateOfWeek),
      end: formatDateToString(lastDateOfWeek)
    }
  };
}

export async function getUpcomingEvents(locationID?: number) {
  const now = new Date();
  const sevenDaysAhead = new Date();
  sevenDaysAhead.setDate(now.getDate() + 7);

  const checkInPromise = getCheckInWithExtras(now, sevenDaysAhead, locationID);

  // Get check-outs from now to 7 days ahead
  const checkOutPromise = getCheckOutWithExtras(now, sevenDaysAhead, locationID);

  return Promise.all([checkInPromise, checkOutPromise])
    .then(([checkIns, checkOuts]) => {
      type OriginalReturnType = Awaited<ReturnType<typeof getCheckInWithExtras>>[number];
      type ExtendedReturnType = OriginalReturnType & { type: string, checkout_date: number };
      let resp: Map<number, ExtendedReturnType[]> = new Map();

      for (const ci of checkIns) {
        let newCI = ci as ExtendedReturnType;
        newCI.type = "CHECKIN";
        let hasKey = resp.has(newCI.check_in.valueOf());
        if (hasKey) {
          resp.get(newCI.check_in.valueOf())?.push(newCI);
        } else {
          resp.set(newCI.check_in.valueOf(), [newCI]);
        }
      }

      for (const co of checkOuts) {
        let newCO = co as unknown as ExtendedReturnType;
        newCO.type = "CHECKOUT";
        let hasKey = resp.has(newCO.checkout_date.valueOf());
        if (hasKey) {
          resp.get(newCO.checkout_date.valueOf())?.push(newCO);
        } else {
          resp.set(newCO.checkout_date.valueOf(), [newCO]);
        }
      }

      return resp;
    });
}

interface IncomeExpenseResult {
  date: string;
  income: number;
  expense: number;
}

enum Period {
  SEVEN_DAYS = '7 D',
  ONE_MONTH = '1 M',
  THREE_MONTHS = '3 M',
  SIX_MONTHS = '6 M',
  ONE_YEAR = '1 Y'
}

export async function getIncomeAndExpense(period: Period, locationID?: number) {
  const now = new Date();
  let startDate: Date;
  let groupBy: string;

  switch (period) {
    case Period.SEVEN_DAYS:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
      break;
    case Period.ONE_MONTH:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      groupBy = 'day';
      break;
    case Period.THREE_MONTHS:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      groupBy = 'day';
      break;
    case Period.SIX_MONTHS:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      groupBy = 'day';
      break;
    case Period.ONE_YEAR:
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      groupBy = 'month';
      break;
    default:
      throw new Error('Invalid period');
  }
  const dateFormat = `${groupBy === 'day' ? 'dd-' : ''}${groupBy === 'month' ? 'MMM ' : 'MM-'}yyyy`;

  // Function to generate array of dates between startDate and endDate
  function getDatesInRange(startDate: Date, endDate: Date): string[] {

    const dates: string[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(format(currentDate, dateFormat));
      if (groupBy === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (groupBy === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1); // Move to the first day of the next month
      }
    }

    return dates;
  }

  const dateRange = getDatesInRange(startDate, now);

  const joinClause = locationID ? Prisma.sql`LEFT JOIN bookings b on b.id = p.booking_id LEFT JOIN rooms r ON r.id = b.room_id` : Prisma.sql``;

  const incomeLocationClause = locationID ? Prisma.sql`r.location_id = ${locationID}` : Prisma.sql`TRUE`;
  const incomeDateClause = groupBy == "day" ? Prisma.sql`payment_date` : Prisma.sql`DATE_TRUNC('month', payment_date)`;
  const income = prisma.$queryRaw<IncomeExpenseResult[]>`
      SELECT to_char(${incomeDateClause}, ${groupBy === 'day' ? "DD-MM-YYYY" : "Mon YYYY"}) AS date,
             SUM(p.amount)                                                                  AS income
      FROM payments p
          ${joinClause}
      WHERE payment_date BETWEEN ${startDate}
        AND ${now}
        AND ${incomeLocationClause}
      GROUP BY ${incomeDateClause}
      ORDER BY date;
  `;

  const expenseLocationClause = locationID ? Prisma.sql`location_id = ${locationID}` : Prisma.sql`TRUE`;
  const expenseDateClause = groupBy == "day" ? Prisma.sql`e.date` : Prisma.sql`DATE_TRUNC('month', e.date)`;
  const expenses = prisma.$queryRaw<IncomeExpenseResult[]>`
      SELECT to_char(${expenseDateClause}, ${groupBy === 'day' ? "DD-MM-YYYY" : "Mon YYYY"}) AS date,
             SUM(e.amount)                                                                   AS expense
      FROM expenses e
      WHERE e.date BETWEEN ${startDate} AND ${now}
        AND ${expenseLocationClause}
      GROUP BY ${expenseDateClause}
      ORDER BY date;
  `;

  // Merge income and expenses by date
  const results: { [key: string]: IncomeExpenseResult } = {};

  return Promise.all([income, expenses])
    .then(([incomeRes, expensesRes]) => {
      dateRange.forEach(date => {
        results[date] = {date, income: 0, expense: 0};
      });

      incomeRes.forEach(item => {
        results[item.date] = {date: item.date, income: item.income || 0, expense: 0};
      });

      expensesRes.forEach(item => {
        if (results[item.date]) {
          results[item.date].expense = item.expense || 0;
        } else {
          results[item.date] = {date: item.date, income: 0, expense: item.expense || 0};
        }
      });

      const sortedResults = Object.values(results).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const labels = sortedResults.map(item => item.date);
      const incomeData = sortedResults.map(item => item.income);
      const expenseData = sortedResults.map(item => item.expense);

      return {
        labels,
        incomeData,
        expenseData
      };
    });
}

export async function getPaymentStatuses() {
  return prisma.paymentStatus.findMany();
}

export async function getPaymentData(status?: number, locationID?: number) {
  return prisma.payment.findMany({
    select: {
      id: true,
      bookings: {
        select: {
          id: true,
          tenants: {
            select: {
              id: true,
              name: true,
            }
          },
          rooms: {
            select: {
              id: true,
              room_number: true,
            }
          },
          durations: {
            select: {
              duration: true
            }
          }
        }
      },
      amount: true,
      paymentstatuses: {
        select: {
          id: true,
          status: true
        }
      }
    },
    where: {
      bookings: {
        rooms: {
          location_id: locationID
        }
      },
      status_id: status
    },
    take: 15,
    orderBy: {
      payment_date: 'desc'
    },
  });
}

export async function getDurations() {
  return prisma.duration.findMany();
}

export async function getBills(durationID?: number, locationID?: number): Promise<{
  id: string,
  fee: string,
  tenant_id: string,
  tenant_name: string,
  room_number: string,
  total_paid: string
}[]> {
  return prisma.$queryRaw`
      SELECT b.id,
             b.fee,
             t.id                       AS tenant_id,
             t.name                     AS tenant_name,
             r.room_number,
             COALESCE(SUM(p.amount), 0) AS total_paid
      FROM bookings b
               LEFT JOIN tenants t ON b.tenant_id = t.id
               LEFT JOIN rooms r ON b.room_id = r.id
               LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.duration_id = ${durationID ?? Prisma.sql`b.duration_id`}
        AND r.location_id = ${locationID ?? Prisma.sql`r.location_id`}
      GROUP BY b.id, t.id, t.name, r.room_number
      HAVING (b.fee - COALESCE(SUM(p.amount), 0)) > 0;
  `;
}

async function getCheckInWithExtras(now: Date, sevenDaysAhead: Date, locationID?: number) {
  return prisma.booking.findMany({
    where: {
      rooms: {
        location_id: locationID
      },
      check_in: {
        gte: now,
        lt: sevenDaysAhead,
      }
    },
    include: {
      rooms: {
        include: {
          roomtypes: true
        }
      },
      tenants: true,
      durations: true,
    },
  });
}

async function getCheckOutWithExtras(now: Date, sevenDaysAhead: Date, locationID?: number) {
  const locationClause = locationID ? Prisma.sql`r.location_id = ${locationID}` : Prisma.sql`TRUE`;
  const result = prisma.$queryRaw`
      SELECT b.id,
             b.fee,
             r.id                                                                                          AS room_id,
             r.room_number,
             rt.type                                                                                       AS room_type,
             t.id                                                                                          AS tenant_id,
             t.name                                                                                        AS tenant_name,
             d.duration,
             b.check_in + INTERVAL '1 DAY' * d.day_count + INTERVAL '1 MONTH' *
                                                           COALESCE(d.month_count, 0)                      AS checkout_date
      FROM "bookings" b
               LEFT JOIN durations d ON b.duration_id = d.id
               LEFT JOIN rooms r ON b.room_id = r.id
               LEFT JOIN tenants t ON b.tenant_id = t.id
               LEFT JOIN roomtypes rt ON r.room_type_id = rt.id
      WHERE ${locationClause}
        AND (
          b.check_in + INTERVAL '1 DAY' * d.day_count + INTERVAL '1 MONTH' * COALESCE(d.month_count, 0)
          ) BETWEEN ${now} AND ${sevenDaysAhead}
  `;

  return result.then(res => (res as any[]).map(r => {
    return {
      id: r.id,
      fee: r.fee,
      checkout_date: r.checkout_date,
      rooms: {
        id: r.room_id,
        room_number: r.room_number,
        roomtypes: {
          type: r.room_type,
        }
      },
      tenants: {
        id: r.tenant_id,
        name: r.tenant_name,
      },
      durations: {
        duration: r.duration,
      }
    };
  }));
}

function getFirstDateOfWeek(date: Date): Date {
  const inputDate = new Date(date);
  const day = inputDate.getDay();
  const diff = (day === 0 ? 6 : day - 1); // Adjusting for the week starting on Monday
  inputDate.setDate(inputDate.getDate() - diff);
  return inputDate;
}

function getLastDateOfWeek(date: Date): Date {
  const inputDate = new Date(date);
  const day = inputDate.getDay();
  const diff = (day === 0 ? -1 : 6 - (day - 1)); // Adjusting for the week ending on Sunday
  inputDate.setDate(inputDate.getDate() + diff);
  return inputDate;
}

function formatDateToString(date: Date): string {
  return new Intl.DateTimeFormat('id', {
    dateStyle: "long",
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
