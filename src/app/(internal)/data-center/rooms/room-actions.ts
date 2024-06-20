import { roomObject, roomObjectWithID } from "@/app/_lib/zod/rooms/zod";
import { number, object, type typeToFlattenedError } from "zod";
import {
    createRoom,
    deleteRoom,
    updateRoomByID,
    getRoomById,
    getAllRooms,
    getRoomsByLocationId,
} from "@/app/_db/room";
import { OmitIDType } from "@/app/_db/db";
import { Room } from "@prisma/client";

export type RoomActionsType<T = OmitIDType<Room>> = {
    success?: Room | Room[];
    failure?: string;
    errors?: typeToFlattenedError<T>;
};

export async function createRoomAction(
  prevState: RoomActionsType,
  formData: FormData
): Promise<RoomActionsType> {
    const { success, error, data } = roomObject.safeParse({
        room_number: formData.get("room_number"),
        room_type_id: formData.get("room_type_id"),
        status_id: formData.get("status_id"),
        location_id: formData.get("location_id"),
    });

    if (!success) {
        return {
            errors: error?.flatten(),
        };
    }

    try {
        let res = await createRoom(data);

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}

export async function updateRoomAction(
  prevState: RoomActionsType,
  formData: FormData
): Promise<RoomActionsType> {
    let { success, error, data } = roomObjectWithID.safeParse({
        id: formData.get("id"),
        room_number: formData.get("room_number"),
        room_type_id: formData.get("room_type_id"),
        status_id: formData.get("status_id"),
        location_id: formData.get("location_id"),
    });

    if (!success) {
        return {
            errors: error?.flatten(),
        };
    }

    try {
        let res = await updateRoomByID(data!.id, {
            ...data,
            // @ts-ignore
            id: undefined,
        });

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}

export async function deleteRoomAction(
  prevState: RoomActionsType<Pick<Room, "id">>,
  formData: FormData
): Promise<RoomActionsType<Pick<Room, "id">>> {
    const { success, error, data } = object({ id: number().positive() }).safeParse({
        id: formData.get("id"),
    });

    if (!success) {
        return {
            errors: error?.flatten(),
        };
    }

    try {
        let res = await deleteRoom(data!.id);

        return {
            success: res,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}

export async function getRoomByIdAction(id: number): Promise<RoomActionsType> {
    try {
        let res = await getRoomById(id);

        return {
            success: res || undefined,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}

export async function getAllRoomsAction(
  limit?: number,
  offset?: number
): Promise<RoomActionsType> {
    try {
        let res = await getAllRooms(limit, offset);

        return {
            success: res || undefined,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}

export async function getRoomsByLocationIdAction(
  location_id: number
): Promise<RoomActionsType> {
    try {
        let res = await getRoomsByLocationId(location_id);

        return {
            success: res || undefined,
        };
    } catch (error) {
        console.error(error);

        return {
            failure: "error",
        };
    }
}
