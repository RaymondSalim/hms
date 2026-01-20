"use server";

import {Prisma, Transaction, TransactionType} from "@prisma/client";
import {format} from "date-fns";
import prisma from "@/app/_lib/primsa";
import {getRoomTypeAvailability, RoomTypeWithRoomCountAndAvailability} from "@/app/_db/availability";
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

type PresetIncomeExpenseArgs = { type: "preset"; period: Period; locationID?: number };
type AllTimeIncomeExpenseArgs = { type: "all"; locationID?: number };
type CustomIncomeExpenseArgs = { type: "custom"; range: { startDate: Date; endDate: Date }; locationID?: number };

export type GroupedIncomeExpenseArgs = PresetIncomeExpenseArgs | AllTimeIncomeExpenseArgs | CustomIncomeExpenseArgs;

type NormalizedIncomeExpenseArgs = {
    type: "preset" | "all" | "custom";
    period?: Period;
    range?: { startDate: Date; endDate: Date };
    locationID?: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeGroupedIncomeExpenseArgs(
    periodOrOptions: Period | GroupedIncomeExpenseArgs,
    locationID?: number
): NormalizedIncomeExpenseArgs {
    if (typeof periodOrOptions === "string") {
        return {
            type: "preset",
            period: periodOrOptions,
            locationID,
        };
    }

    return {
        type: periodOrOptions.type,
        period: periodOrOptions.type === "preset" ? periodOrOptions.period : undefined,
        range: periodOrOptions.type === "custom" ? periodOrOptions.range : undefined,
        locationID: periodOrOptions.locationID ?? locationID,
    };
}

export async function getOverviewData(locationID?: number) {
    const today = new Date();
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(today.getDate() + 7);

    const [checkIn, checkOut, roomCount] = await prisma.$transaction([
        // Get check-ins from today to 7 days ahead
        prisma.booking.findMany({
            where: {
                rooms: {
                    location_id: locationID
                },
                start_date: {
                    gte: today,
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
            }
        }),

        // Get check-outs from today to 7 days ahead
        prisma.booking.findMany({
            where: {
                rooms: {
                    location_id: locationID,
                },
                end_date: {
                    gte: today,
                    lt: sevenDaysAhead,
                },
            },
            include: {
                rooms: {
                    include: {
                        roomtypes: true
                    }
                },
                tenants: true,
                durations: true,
            }
        }),

        // Get total room count
        prisma.room.count({
            where: {
                location_id: locationID,
            }
        })
    ]);

    // Get available rooms count using the centralized function
    const roomAvailability: RoomTypeWithRoomCountAndAvailability[] = await getRoomTypeAvailability(locationID, { from: today, to: sevenDaysAhead });
    const availableRooms = roomAvailability.reduce((sum: number, rt: RoomTypeWithRoomCountAndAvailability) => sum + rt.roomLeft, 0);

    return {
        check_in: checkIn,
        check_out: checkOut,
        available: availableRooms,
        occupied: roomCount - availableRooms,
        date_range: {
            start: today.toISOString(),
            end: sevenDaysAhead.toISOString()
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
    periodOrOptions: Period | GroupedIncomeExpenseArgs,
    locationID?: number
): Promise<GroupedIncomeExpense> {
    const normalizedArgs = normalizeGroupedIncomeExpenseArgs(periodOrOptions, locationID);
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let groupBy: "day" | "month";

    if (normalizedArgs.type === "preset") {
        switch (normalizedArgs.period) {
            case Period.SEVEN_DAYS:
                startDate = new Date(now.getTime() - 7 * DAY_IN_MS);
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
    } else if (normalizedArgs.type === "all") {
        const earliestTransaction = await prisma.transaction.aggregate({
            _min: { date: true },
            where: {
                location_id: normalizedArgs.locationID,
            },
        });

        startDate = earliestTransaction._min.date ? new Date(earliestTransaction._min.date) : now;
        // For very long ranges, use monthly grouping to avoid overly dense graphs
        groupBy = "month";
    } else {
        if (!normalizedArgs.range) {
            throw new Error("Rentang tanggal kustom belum ditentukan");
        }

        startDate = new Date(normalizedArgs.range.startDate);
        endDate = new Date(normalizedArgs.range.endDate);

        if (startDate > endDate) {
            throw new Error("Rentang tanggal tidak valid: tanggal mulai setelah tanggal akhir");
        }

        const diffDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_IN_MS));
        groupBy = diffDays > 90 ? "month" : "day";
    }

    const startDateNormalized = new Date(startDate);
    startDateNormalized.setHours(0, 0, 0, 0);

    let endDateNormalized = new Date(endDate);
    endDateNormalized.setHours(23, 59, 59, 999);

    if (groupBy === "month") {
        startDateNormalized.setDate(1);
        endDateNormalized = new Date(endDateNormalized.getFullYear(), endDateNormalized.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const dateRange = getDatesInRange(startDateNormalized, endDateNormalized, groupBy);

    // Fetch income transactions
    const incomeTransactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startDateNormalized, lte: endDateNormalized },
                location_id: normalizedArgs.locationID,
                type: TransactionType.INCOME,
            },
        orderBy: { date: "asc" },
        });

    // Fetch expense transactions
    const expenseTransactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startDateNormalized, lte: endDateNormalized },
                location_id: normalizedArgs.locationID,
                type: TransactionType.EXPENSE,
            },
        orderBy: { date: "asc" },
    });

    // Group transactions based on date
    const groupedIncome: { [key: string]: Transaction[] } = {};
    incomeTransactions.forEach((tx) => {
        const dateKey = groupBy === "day" ? format(tx.date, "dd-MMM-yyyy") : format(tx.date, "MMM yyyy");
        if (!groupedIncome[dateKey]) {
            groupedIncome[dateKey] = [];
        }
        groupedIncome[dateKey].push(tx);
        });

    const groupedExpense: { [key: string]: Transaction[] } = {};
    expenseTransactions.forEach((tx) => {
        const dateKey = groupBy === "day" ? format(tx.date, "dd-MMM-yyyy") : format(tx.date, "MMM yyyy");
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
    return prisma.booking.findMany({
        where: {
            rooms: {
                location_id: locationID,
            },
            end_date: {
                gte: now,
                lt: sevenDaysAhead,
            },
        },
        select: {
            id: true,
            fee: true,
            end_date: true,
            rooms: {
                select: {
                    id: true,
                    room_number: true,
                    roomtypes: {
                        select: {
                            type: true
                        }
                    },
                },
            },
            tenants: {
                select: {
                    id: true,
                    name: true,
                },
            },
            durations: {
                select: {
                    duration: true
                }
            },
        },
    }).then(results => results.map(r => ({
        ...r,
        checkout_date: r.end_date, // For compatibility with the mapping logic
    })));
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
