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

  const bookingsCountRaw = prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::integer AS COUNT
      FROM "bookings" b
               LEFT JOIN durations d ON b.duration_id = d.id
      WHERE (
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
    occupied: occupiedCount
  };
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
