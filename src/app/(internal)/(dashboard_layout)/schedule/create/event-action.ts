"use server";

import {OmitIDTypeAndTimestamp, OmitTimestamp, PartialBy} from "@/app/_db/db";
import {Event, Prisma} from "@prisma/client";
import {eventSchemaWithOptionalID} from "@/app/_lib/zod/event/zod";
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/library";
import {createEvent, updateEventByID} from "@/app/_db/event";
import {GenericActionsType} from "@/app/_lib/actions";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export async function upsertEventAction(reqData: OmitIDTypeAndTimestamp<Event>): Promise<GenericActionsType<Event>> {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = eventSchemaWithOptionalID.safeParse(reqData);

    if (!success) {
        return toClient({
            errors: error?.format()
        });
    }

    let res;

    // If it's a recurring event, ensure we have a groupId
    if (data.recurring && data.extendedProps?.recurrence) {
        data.extendedProps.recurrence.groupId = data.extendedProps.recurrence.groupId || `recurring_${Date.now()}`;
    }

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
        extendedProps: data.extendedProps ? data.extendedProps as Prisma.JsonObject : null
    };


    try {
        if (data?.id) {
            res = await updateEventByID(data.id, newData);
        } else {
            res = await createEvent(newData);
        }
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertEventAction]", {error});
        }
        if (error instanceof Error) {
            serverLogger.error("[upsertEventAction]", {error});
        }

        return toClient({failure: "Request unsuccessful"});
    }

    return toClient({
        success: res
    });
}
