"use server";

import {RoomType} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {createRoomType, deleteRoomType, updateRoomTypeByID} from "@/app/_db/room";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";
import {roomTypeSchemaWithOptionalID} from "@/app/_lib/zod/rooms/roomtypes";

export async function upsertRoomTypeAction(roomData: Partial<RoomType>): Promise<GenericActionsType<RoomType>> {
  const {success, data, error} = roomTypeSchemaWithOptionalID.safeParse(roomData);

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  try {
    let res;
    // Update
    if (data?.id) {
      res = await updateRoomTypeByID(data.id, data);
    } else {
      res = await createRoomType(data);
    }

    return {
      success: res
    };

  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertRoomTypeAction]", error.code, error.message);
      switch (error.code) {
        case "P2002":
          return {failure: "Room Type is taken"};
        case "P2003":
          return {failure: "There are rooms with this type. Please remove or change the room types first"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertRoomTypeAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteRoomTypeAction(id: string): Promise<GenericActionsType<RoomType>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.format()
    };
  }

  try {
    let res = await deleteRoomType(parsedData.data.id);
    return {
      success: res,
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertRoomTypeAction]", error.code, error.message);
      switch (error.code) {
        case "P2003":
          return {failure: "There are rooms with this type.\nPlease remove or change the room types first"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[deleteRoomTypeAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}
