"use server";

import {Duration} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object, ZodIssueCode} from "zod";
import {durationSchemaWithOptionalID} from "@/app/_lib/zod/duration/zod";
import {createDuration, deleteDuration, updateDurationByID} from "@/app/_db/duration";
import {IntersectionToUnion} from "@/app/_lib/util";

export async function upsertDurationAction(roomData: Partial<Duration>): Promise<GenericActionsType<Duration>> {
  const {success, data, error} = durationSchemaWithOptionalID.safeParse(roomData);

  if (!success) {
    if (error?.issues?.[0].code == ZodIssueCode.custom) {
      return {
        failure: error.errors[0].message
      };
    }
    return {
      errors: error?.format()
    };
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

    return {
      success: res
    };

  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[upsertDurationAction]", error.code, error.message);
      switch (error.code) {
        case "P2002":
          return {failure: "Duration Name is taken."};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[upsertDurationAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteDurationAction(id: string): Promise<GenericActionsType<Duration>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.format()
    };
  }

  try {
    let res = await deleteDuration(parsedData.data.id);
    return {
      success: res,
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[deleteDurationAction]", error.code, error.message);
      switch (error.code) {
        case "P2003":
          return {failure: "There are rooms with this duration.\nPlease remove or change the room duration first"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[deleteDurationAction]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}
