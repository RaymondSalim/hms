"use server";

import {Duration} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object, ZodIssueCode} from "zod";
import {durationSchemaWithOptionalID} from "@/app/_lib/zod/duration/zod";
import {createDuration, deleteDuration, getSortedDurations, updateDurationByID} from "@/app/_db/duration";
import {IntersectionToUnion} from "@/app/_lib/util";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export async function upsertDurationAction(roomData: Partial<Duration>): Promise<GenericActionsType<Duration>> {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = durationSchemaWithOptionalID.safeParse(roomData);

    if (!success) {
        if (error?.issues?.[0].code == ZodIssueCode.custom) {
            return toClient({
                failure: error.errors[0].message
            });
        }
        return toClient({
            errors: error?.format()
        });
    }

    let dataType: IntersectionToUnion<typeof data> = data;

    try {
        let res;
        // Update
        if (data?.id) {
            // @ts-ignore
            res = await updateDurationByID(data.id, dataType);
        } else {
            // @ts-ignore
            res = await createDuration(data);
        }

        return toClient({
            success: res
        });

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertDurationAction]", {error});
            switch (error.code) {
                case "P2002":
                    return toClient({failure: "Duration Name is taken."});
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[upsertDurationAction]", {error});
        }

        return toClient({failure: "Request unsuccessful"});
    }
}

export async function deleteDurationAction(id: string): Promise<GenericActionsType<Duration>> {
    after(() => {
        serverLogger.flush();
    });
    const parsedData = object({id: number().positive()}).safeParse({
        id: id,
    });

    if (!parsedData.success) {
        return toClient({
            errors: parsedData.error.format()
        });
    }

    try {
        let res = await deleteDuration(parsedData.data.id);
        return toClient({
            success: res,
        });
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[deleteDurationAction]", {error, duration_id: id});
            switch (error.code) {
                case "P2003":
                    return toClient({failure: "There are rooms with this duration.\nPlease remove or change the room duration first"});
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[deleteDurationAction]", {error, duration_id: id});
        }

        return toClient({failure: "Request unsuccessful"});
    }
}

export async function getSortedDurationsAction() {
    return getSortedDurations().then(toClient);
}
