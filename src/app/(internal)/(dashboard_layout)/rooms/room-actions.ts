"use server";

import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {roomWithType} from "@/app/_lib/zod/rooms/zod";
import {createRoom, deleteRoom, RoomsWithTypeAndLocation, updateRoomByID, getRoomsWithBookings, RoomsWithTypeAndLocationAndBookings} from "@/app/_db/room";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";

export async function upsertRoomAction(roomData: Partial<RoomsWithTypeAndLocation>): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
  const {success, data, error} = roomWithType.safeParse(roomData);

  if (!success) {
    return {
      errors: error?.format()
    };
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

    return {
      // @ts-ignore
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertRoomAction][PrismaKnownError]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Room Number is taken"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertRoomAction][PrismaUnknownError]", error.message);
    } else {
      console.error("[upsertRoomAction]", error);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function getRoomsWithBookingsAction(locationID?: number, limit?: number, offset?: number) {
  return getRoomsWithBookings(undefined, locationID, limit, offset);
}

export async function deleteRoomAction(id: string): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.format()
    };
  }

  try {
    let res = await deleteRoom(parsedData.data.id);
    return {
      success: res,
    };
  } catch (error) {
    console.error(error);
    return {
      failure: "Error deleting guest",
    };
  }
}
