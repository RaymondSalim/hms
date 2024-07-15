"use server";

import {Room} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {roomSchemaWithOptionalID} from "@/app/_lib/zod/rooms/zod";
import {createRoom, deleteRoom, RoomsWithTypeAndLocation, updateRoomByID} from "@/app/_db/room";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";

export async function upsertRoomAction(roomData: Partial<Room>): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
  const {success, data, error} = roomSchemaWithOptionalID.safeParse(roomData);

  if (!success) {
    return {
      errors: error?.formErrors
    };
  }

  try {
    let res;
    // Update
    if (data?.id) {
      res = await updateRoomByID(data.id, data);
    } else {
      res = await createRoom(data);
    }

    return {
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[register]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Room Number is taken"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertRoomAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteRoomAction(id: string): Promise<GenericActionsType<RoomsWithTypeAndLocation>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.formErrors
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
