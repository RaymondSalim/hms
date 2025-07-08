"use server";

import {Prisma, Transaction, TransactionType} from "@prisma/client";
import {format} from "date-fns";
import prisma from "@/app/_lib/primsa";
import {Period} from "@/app/_enum/financial";
import {getDatesInRange} from "@/app/_lib/util";

export interface GroupedIncomeExpense {
    labels: string[];
    incomeData: Transaction[][];
    expenseData: Transaction[][];
}

export interface SimplifiedIncomeExpense {
    labels: string[];
    incomeData: number[];
    expenseData: number[];
}

export async function getOverviewData(locationID?: number) {
    const today = new Date();
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(today.getDate() + 7);

    const checkIn = prisma.booking.count({
        where: {
            rooms: {
                location_id: locationID
            },
            start_date: {
                gte: today,
                lt: sevenDaysAhead,
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
            b.start_date + INTERVAL '1 MONTH' * COALESCE(d.month_count, 0)
            ) BETWEEN ${today} AND ${sevenDaysAhead}
    `;
    // const bookingsCount: Promise<number> = bookingsCountRaw.then(e => new Promise(resolve => setTimeout(() => resolve(e[0].count), 10000)));
    const bookingsCount = bookingsCountRaw.then(e => e[0].count);

    const availableCount = prisma.room.count({
        where: {
            roomstatuses: {
                id: 1,
            },
            location_id: locationID,
        }
    });

    const occupiedCount = prisma.room.count({
        where: {
            roomstatuses: {
                id: 2,
            },
            location_id: locationID,
        }
    });

    return {
        check_in: checkIn,
        check_out: bookingsCount,
        available: availableCount,
        occupied: occupiedCount,
        date_range: {
            start: formatDateToString(today),
            end: formatDateToString(sevenDaysAhead)
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
                let hasKey = resp.has(newCI.start_date.valueOf());
                if (hasKey) {
                    resp.get(newCI.start_date.valueOf())?.push(newCI);
                } else {
                    resp.set(newCI.start_date.valueOf(), [newCI]);
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

export async function getGroupedIncomeExpense(
    period: Period,
    locationID?: number
): Promise<GroupedIncomeExpense> {
    const now = new Date();
    let startDate: Date;
    let groupBy: "day" | "month";

    switch (period) {
        case Period.SEVEN_DAYS:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            groupBy = "day";
            break;
        case Period.ONE_MONTH:
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            groupBy = "day";
            break;
        case Period.THREE_MONTHS:
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            groupBy = "day";
            break;
        case Period.SIX_MONTHS:
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 6);
            groupBy = "day";
            break;
        case Period.ONE_YEAR:
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            groupBy = "month";
            break;
        default:
            throw new Error("Invalid period");
    }

    const dateRange = getDatesInRange(startDate, now, groupBy);

    // Fetch income transactions
    const incomeTransactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startDate, lte: now },
                location_id: locationID,
                type: TransactionType.INCOME,
            },
        orderBy: { date: "asc" },
        });

    // Fetch expense transactions
    const expenseTransactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startDate, lte: now },
                location_id: locationID,
                type: TransactionType.EXPENSE,
            },
        orderBy: { date: "asc" },
    });

    // Group transactions based on date
    const groupedIncome: { [key: string]: Transaction[] } = {};
    incomeTransactions.forEach((tx) => {
        const dateKey = groupBy === "day" ? format(tx.date, "dd-MM-yyyy") : format(tx.date, "MMM yyyy");
        if (!groupedIncome[dateKey]) {
            groupedIncome[dateKey] = [];
        }
        groupedIncome[dateKey].push(tx);
        });

    const groupedExpense: { [key: string]: Transaction[] } = {};
    expenseTransactions.forEach((tx) => {
        const dateKey = groupBy === "day" ? format(tx.date, "dd-MM-yyyy") : format(tx.date, "MMM yyyy");
        if (!groupedExpense[dateKey]) {
            groupedExpense[dateKey] = [];
        }
        groupedExpense[dateKey].push(tx);
    });

    // Merge into a complete timeline with grouped transactions
    const results = dateRange.map((date) => ({
        date,
        income: groupedIncome[date] || [],
        expense: groupedExpense[date] || [],
        }));

    const labels = results.map((item) => item.date);
    const incomeData = results.map((item) => item.income); // Array of arrays of Transaction
    const expenseData = results.map((item) => item.expense); // Array of arrays of Transaction

    return {
        labels,
        incomeData,
        expenseData,
    };
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
            start_date: {
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
               r.id                                      AS room_id,
               r.room_number,
               rt.type                                   AS room_type,
               t.id                                      AS tenant_id,
               t.name                                    AS tenant_name,
               d.duration,
               b.start_date + INTERVAL '1 MONTH' *
                              COALESCE(d.month_count, 0) AS checkout_date
        FROM "bookings" b
                 LEFT JOIN durations d ON b.duration_id = d.id
                 LEFT JOIN rooms r ON b.room_id = r.id
                 LEFT JOIN tenants t ON b.tenant_id = t.id
                 LEFT JOIN roomtypes rt ON r.room_type_id = rt.id
        WHERE ${locationClause}
          AND (
            b.start_date + INTERVAL '1 MONTH' * COALESCE(d.month_count, 0)
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
        dateStyle: "short",
        timeZone: 'Asia/Jakarta',
    }).format(date);
}

/**
 * Returns the 10 most recent transactions, optionally filtered by location.
 */
export async function getRecentTransactions(locationID?: number): Promise<Transaction[]> {
    return prisma.transaction.findMany({
        where: {
            location_id: locationID,
        },
        orderBy: {
            date: "desc",
        },
        take: 10,
    });
}