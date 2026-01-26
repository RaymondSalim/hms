"use server";

import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {roomWithType} from "@/app/_lib/zod/rooms/zod";
import {createRoom, deleteRoom, getRoomsWithBookings, RoomsWithTypeAndLocation, updateRoomByID} from "@/app/_db/room";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

export async function upsertRoomAction(roomData: Partial<RoomsWithTypeAndLocation>): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = roomWithType.safeParse(roomData);

    if (!success) {
        return toClient({
            errors: error?.format()
        });
    }

    try {
        let res;
        // Update
        if (data?.id) {
            // @ts-ignore
            res = await updateRoomByID(data.id, data);
        } else {
            // @ts-ignore
            res = await createRoom(data);
        }
        res = res[res.length - 1];

        return toClient({
            // @ts-ignore
            success: res
        });
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[upsertRoomAction][PrismaKnownError]", {error});
            if (error.code == "P2002") {
                return toClient({failure: "Room Number is taken"});
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[upsertRoomAction][PrismaUnknownError]", {error});
        } else {
            serverLogger.error("[upsertRoomAction]", {error});
        }

        return toClient({failure: "Request unsuccessful"});
    }
}

export async function getRoomsWithBookingsAction(locationID?: number, limit?: number, offset?: number) {
    return getRoomsWithBookings(undefined, locationID, limit, offset).then(toClient);
}

export async function deleteRoomAction(id: string): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
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
        let res = await deleteRoom(parsedData.data.id);
        return toClient({
            success: res,
        });
    } catch (error) {
        serverLogger.error("deleteRoomAction", {error, room_id: id});
        return toClient({
            failure: "Error deleting guest",
        });
    }
}
