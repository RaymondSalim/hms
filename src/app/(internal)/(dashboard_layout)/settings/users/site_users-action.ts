"use server";

import {SiteUser} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {siteUserSchemaWithOptionalID} from "@/app/_lib/zod/user/zod";
import {createUser, deleteUser, getUserByID, updateUser} from "@/app/_db/user";
import {auth} from "@/app/_lib/auth/auth";
import {GenericActionsType} from "@/app/_lib/actions";
import {object, string} from "zod";
import bcrypt from "bcrypt";

// Action to update site users
export async function upsertSiteUserAction(userData: Partial<SiteUser>): Promise<GenericActionsType<SiteUser>> {
  const session = await auth();

  if (session && session.user) {
    const currUser = await getUserByID(session.user.id);
    if (currUser) {
      if (currUser.role_id != 1) {
        return {failure: "Unauthorized"};
      }
    }
  }

  const {success, data, error} = siteUserSchemaWithOptionalID.safeParse(userData);

  if (!success) {
    return {
      // errors: Object.fromEntries(error.errors.entries())
      errors: error?.format()
    };
  }

  const newData = {
    ...data,
    image: "",
  };

  try {
    let res;
    // Update
    if (data?.id) {
      res = await updateUser(data.id, newData);
    } else {
      // Create User
      if (newData.password) {
        newData.password = await bcrypt.hash(newData.password, 10);

        // @ts-ignore
        res = await createUser(newData);
      }
    }

    return {
      success: res
    };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[register]", error.code, error.message);
      if (error.code == "P2002") {
        return {failure: "Alamat email telah terdaftar"};
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[register]", error.message);
    }

    return {failure: "Update unsuccessful"};
  }
}

export async function deleteUserAction(id: string): Promise<GenericActionsType<Pick<SiteUser, "id">>> {
  const session = await auth();

  if (session && session.user) {
    const currUser = await getUserByID(session.user.id);
    if (currUser) {
      if (currUser.role_id != 1) {
        return {failure: "Unauthorized"};
      }
    }
  }

  const {success, error, data} = object({id: string().min(1, "ID is required")}).safeParse({
    id: id
  });

  if (!success) {
    return {
      errors: error?.format()
    };
  }

  try {
    let res = await deleteUser(data!.id);

    return {
      success: res
    };
  } catch (error) {
    console.error(error);

    return {
      failure: "error"
    };
  }
}
