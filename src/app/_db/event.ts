"use server";

import {OmitIDTypeAndTimestamp} from "@/app/_db/db";
import {Event} from "@prisma/client";
import prisma from "@/app/_lib/primsa";

export async function updateEventByID(id: number, data: OmitIDTypeAndTimestamp<Event>) {
    return prisma.event.update({
        where: {
            id
        },
        data: {
            ...data,
            // @ts-expect-error weird error
            extendedProps: data.extendedProps,
            id: undefined
        }
    });
}

export async function createEvent(data: OmitIDTypeAndTimestamp<Event>) {
    return prisma.event.create({
        data: {
            ...data,
            // @ts-expect-error weird error
            extendedProps: data.extendedProps,
            id: undefined
        }
    });
}

export async function getEventByID(id: number) {
    return prisma.event.findFirst({
        where: {
            id
        }
    });
}