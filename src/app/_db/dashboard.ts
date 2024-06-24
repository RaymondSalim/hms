"use server";

import {Prisma} from "@prisma/client";

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
      let resp: Map<number, Prisma.PromiseReturnType<typeof getCheckInWithExtras>> = new Map();

      for (const ci of checkIns) {
        // @ts-ignore
        ci.type = "CHECKIN";
        let hasKey = resp.has(ci.check_in.valueOf());
        if (hasKey) {
          resp.get(ci.check_in.valueOf())?.push(ci);
        } else {
          resp.set(ci.check_in.valueOf(), [ci]);
        }
      }

      for (const co of checkOuts) {
        // @ts-ignore
        co.type = "CHECKOUT";
        let hasKey = resp.has(co.checkout_date.valueOf());
        if (hasKey) {
          // @ts-ignore
          resp.get(co.checkout_date.valueOf())?.push(co);
        } else {
          // @ts-ignore
          resp.set(co.checkout_date.valueOf(), [co]);
        }
      }

      return resp;
    });


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
