"use server";

import { SiteUser } from "@prisma/client";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime/library";
import { siteUserSchemaWithOptionalID } from "@/app/_lib/zod/user/zod";
import { createUser, deleteUser, getUserByID, updateUser } from "@/app/_db/user";
import { GenericActionsType } from "@/app/_lib/actions";
import { object, string } from "zod";
import bcrypt from "bcrypt";
import { 
  withUserCreate, 
  withUserUpdate, 
  withUserDelete, 
  withUserRead,
  withAnyUserPermission 
} from "@/app/_lib/rbac-actions";
import { PERMISSIONS } from "@/app/_lib/rbac";

// Base action to create/update users (without RBAC wrapper)
async function upsertSiteUserBase(userData: Partial<SiteUser>): Promise<GenericActionsType<SiteUser>> {
  const { success, data, error } = siteUserSchemaWithOptionalID.safeParse(userData);

  if (!success) {
    return {
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
        return { failure: "Alamat email telah terdaftar" };
      }
    } else if (error instanceof PrismaClientUnknownRequestError) {
      console.error("[register]", error.message);
    }

    return { failure: "Update unsuccessful" };
  }
}

// Base action to delete users (without RBAC wrapper)
async function deleteUserBase(id: string): Promise<GenericActionsType<Pick<SiteUser, "id">>> {
  const { success, error, data } = object({ id: string().min(1, "ID is required") }).safeParse({
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

// RBAC-protected actions
export const upsertSiteUserAction = withAnyUserPermission(upsertSiteUserBase);
export const deleteUserAction = withUserDelete(deleteUserBase);

// Alternative: More granular control
export const createUserAction = withUserCreate(async (userData: Omit<SiteUser, "id" | "createdAt" | "updatedAt" | "emailVerified" | "image">) => {
  const newData = {
    ...userData,
    image: "",
  };

  if (newData.password) {
    newData.password = await bcrypt.hash(newData.password, 10);
  }

  try {
    const res = await createUser(newData);
    return { success: res };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code == "P2002") {
        return { failure: "Alamat email telah terdaftar" };
      }
    }
    return { failure: "Create unsuccessful" };
  }
});

export const updateUserAction = withUserUpdate(async (id: string, userData: Pick<SiteUser, "email" | "image" | "name" | "role_id">) => {
  try {
    const res = await updateUser(id, userData);
    return { success: res };
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code == "P2002") {
        return { failure: "Alamat email telah terdaftar" };
      }
    }
    return { failure: "Update unsuccessful" };
  }
});

// Action to get users (read permission)
export const getUsersAction = withUserRead(async (offset?: number, limit?: number) => {
  try {
    const users = await getUserByID(offset?.toString() || '');
    return { success: users };
  } catch (error) {
    return { failure: "Failed to fetch users" };
  }
});

// Example of using multiple permissions
export const manageUserRolesAction = withAnyUserPermission(async (userId: string, roleId: number) => {
  try {
    // This action requires either user:update or role:update permission
    const user = await getUserByID(userId);
    if (!user) {
      return { failure: "User not found" };
    }

    const updatedUser = await updateUser(userId, { 
      name: user.name,
      email: user.email,
      image: user.image || "",
      role_id: roleId 
    });
    return { success: updatedUser };
  } catch (error) {
    return { failure: "Failed to update user role" };
  }
});