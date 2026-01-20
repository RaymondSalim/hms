"use server";

import {EventApi} from "@fullcalendar/core";
import prisma from "@/app/_lib/primsa";
import {CalenderEventTypes, CheckInOutType} from "@/app/(internal)/(dashboard_layout)/bookings/enum";
import {Event} from "@prisma/client";
import {GenericActionsType} from "@/app/_lib/actions";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export type CalenderEventRange = {
    startDate: Date | string,
    endDate: Date | string,
}

export type CalenderEvent = Partial<Omit<Event, "id">> & Partial<EventApi> & {
    type: {
        main?: CalenderEventTypes,
        sub?: any
    },
    originalData?: any,
    extendedProps?: Record<string, any>
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
            title: `Kamar ${b.rooms?.room_number} | ${b.id} Kontrak Dimulai`,
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
            title: `Kamar ${b.rooms?.room_number} | ${b.id} Kontrak Selesai`,
            backgroundColor: "red",
            originalData: b,
        });
    });

    const eventItems = await prisma.event.findMany({
        where: {
            OR: [
                {
                    start: {
                        gte: startDate,
                        lt: endDate,
                    }
                },
                {
                    end: {
                        gte: startDate,
                        lt: endDate,
                    }
                },
                {
                    recurring: true,
                    start: {
                        lte: endDate,
                    }
                }
            ],
        },
    });

    eventItems.forEach(e => {
        const eventData = {
            ...e,
            id: e.id.toString(),
            originalData: e,
            backgroundColor: e.backgroundColor || undefined,
            borderColor: e.borderColor || undefined,
            textColor: e.textColor || undefined,
            extendedProps: e.extendedProps ? (typeof e.extendedProps === 'string' ? JSON.parse(e.extendedProps) : e.extendedProps) : undefined
        };

        // If it's a recurring event, add the recurrence properties
        if (e.recurring && eventData.extendedProps?.recurrence) {
            Object.assign(eventData, {
                daysOfWeek: eventData.extendedProps.recurrence.daysOfWeek,
                startRecur: eventData.extendedProps.recurrence.startRecur,
                endRecur: eventData.extendedProps.recurrence.endRecur,
                groupId: eventData.extendedProps.recurrence.groupId || `recurring_${e.id}`,
                duration: eventData.extendedProps.recurrence.duration
            });
        }

        events.push(eventData);
    });

    return toClient(events);
}

export async function deleteCalendarEvent(id: number): Promise<GenericActionsType<boolean>> {
    after(() => {
        serverLogger.flush();
    });
    try {
        await prisma.event.delete({
            where: {
                id
            }
        });
    } catch (error) {
        serverLogger.error("[deleteCalendarEvent]", {error, event_id: id});
        return toClient({
            failure: "Request Unsuccessful",
        });
    }

    return toClient({
        success: true,
    });
}
