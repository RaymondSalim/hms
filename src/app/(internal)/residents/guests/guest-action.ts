"use server";

import {Guest} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {GenericActionsType} from "@/app/_lib/actions";
import {number, object} from "zod";
import {guestSchemaWithOptionalID} from "@/app/_lib/zod/guests/zod";
import {createGuest, deleteGuest, GuestWithTenant, updateGuestByID} from "@/app/_db/guest";

// Action to update guests
export async function upsertGuestAction(guestData: Partial<Guest>): Promise<GenericActionsType<GuestWithTenant>> {
  const {success, data, error} = guestSchemaWithOptionalID.safeParse(guestData);

  if (!success) {
    return {
      errors: error?.formErrors
    };
  }

  try {
    let res;
    // Update
    if (data?.id) {
      res = await updateGuestByID(data.id, data);
    } else {
      res = await createGuest(data);
    }

    return {
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[register]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Email address is taken"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[register]", error.message);
    }

    return {failure: "Request unsuccessful"};
  }
}

export async function deleteGuestAction(id: string): Promise<GenericActionsType<GuestWithTenant>> {
  const parsedData = object({id: number().positive()}).safeParse({
    id: id,
  });

  if (!parsedData.success) {
    return {
      errors: parsedData.error.formErrors
    };
  }

  try {
    let res = await deleteGuest(parsedData.data.id);
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
