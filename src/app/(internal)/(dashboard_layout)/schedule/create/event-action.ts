"use server";

import {OmitIDTypeAndTimestamp, OmitTimestamp, PartialBy} from "@/app/_db/db";
import {Event, Prisma} from "@prisma/client";
import {eventSchemaWithOptionalID} from "@/app/_lib/zod/event/zod";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {createEvent, updateEventByID} from "@/app/_db/event";
import {GenericActionsType} from "@/app/_lib/actions";

export async function upsertEventAction(reqData: OmitIDTypeAndTimestamp<Event>): Promise<GenericActionsType<Event>> {
    const {success, data, error} = eventSchemaWithOptionalID.safeParse(reqData);

    if (!success) {
        return {
            errors: error?.format()
        };
    }

    let res;

    let newData: OmitTimestamp<PartialBy<Event, "id">> = {
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        start: data.start,
        end: data.end ?? null,
        allDay: data.allDay ?? false,
        backgroundColor: data.backgroundColor ?? null,
        borderColor: data.borderColor ?? null,
        textColor: data.textColor ?? null,
        recurring: data.recurring ?? false,
        extendedProps: data.extendedProps ? JSON.parse(data.extendedProps as string) as Prisma.JsonValue : null
    };

    try {
        if (data?.id) {
            res = await updateEventByID(data.id, newData);
        } else {
            res = await createEvent(newData);
        }
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[upsertEventAction]", error.code, error.message);
        }
        if (error instanceof Error) {
            console.error("[upsertEventAction]", error.message);
        }

        return {failure: "Request unsuccessful"};
    }

    return {
        success: res
    };
}