"use server";

import {SiteUser} from "@prisma/client";
import {Optional, PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {siteUserSchemaWithID} from "@/app/_lib/zod/user/zod";
import {getUserByID, updateUser} from "@/app/_db/user";
import {auth} from "@/app/_lib/auth";

export type UpdateUserType = {
  success?: string,
  failure?: string,
  errors?: Optional<SiteUser>
}

// Action to update site users
export async function updateSiteUserAction(prevState: UpdateUserType, formData: FormData): Promise<UpdateUserType> {
  const session = await auth();

  if (session && session.user) {
    const currUser = await getUserByID(session.user.id);
    if (currUser) {
      if (currUser.role_id != 1) {
        return { failure: "Unauthorized" };
      }
    }
  }

  const {success, data, error} = siteUserSchemaWithID.safeParse({
    id: formData.get('user_id'),
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role_id: formData.get('role_id'),
  });

  if (!success) {
    return {
      errors: Object.fromEntries(error.errors.entries())
    };
  }

  try {
    await updateUser(data.id, data);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      console.error("[register]", error.code, error.message);
      if (error.code == "P2002") {
        return { failure: "Email address is taken" };
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[register]", error.message);
    }

    return { failure: "Update unsuccessful" };
  }

  return { success: "Updated successfully" };
}
