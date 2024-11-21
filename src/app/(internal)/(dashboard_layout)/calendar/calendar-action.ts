"use server";

import {EventApi} from "@fullcalendar/core";
import prisma from "@/app/_lib/primsa";
import {CalenderEventTypes, CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";

export type CalenderEventRange = {
    startDate: Date | string,
    endDate: Date | string,
}

export type CalenderEvent = Partial<EventApi> & {
    type: {
        main: CalenderEventTypes,
        sub: any
    },
    originalData?: any
}

export async function getCalendarEvents(locationID?: number, dateRange?: CalenderEventRange): Promise<Partial<CalenderEvent>[]> {
    let events: Partial<CalenderEvent>[] = [];

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateRange) {
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
    }

    const bookings = await prisma.booking.findMany({
        where: {
            OR: [
                {
                    start_date: {
                        gte: startDate,
                        lt: endDate,
                    }
                },
                {
                    end_date: {
                        gte: startDate,
                        lt: endDate,
                    }
                }
            ],
            rooms: {
                location_id: locationID,
            }
        },
        include: {
            tenants: true,
            rooms: true
        },
        distinct: "id"
    });

    bookings.forEach(b => {
        events.push({
            id: `${b.id.toString()}_in`,
            type: {
                main: CalenderEventTypes.BOOKING,
                sub: CheckInOutType.CHECK_IN
            },
            allDay: true,
            // @ts-expect-error type error
            start: b.start_date.toISOString(),
            title: `${b.rooms?.room_number} | ${b.id} Kontrak Dimulai`,
            backgroundColor: "blue",
            originalData: b,
        });

        events.push({
            id: `${b.id.toString()}_out`,
            type: {
                main: CalenderEventTypes.BOOKING,
                sub: CheckInOutType.CHECK_OUT
            },
            allDay: true,
            // @ts-expect-error type error
            start: b.end_date.toISOString(),
            title: `${b.rooms?.room_number} | ${b.id} Kontrak Selesai`,
            backgroundColor: "red",
            originalData: b,
        });
    });

    return events;
}