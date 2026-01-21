"use server";

import {SiteUser} from "@prisma/client";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {siteUserSchemaWithOptionalID} from "@/app/_lib/zod/user/zod";
import {createUser, deleteUser, getUserByID, updateUser} from "@/app/_db/user";
import {auth} from "@/app/_lib/auth";
import {GenericActionsType} from "@/app/_lib/actions";
import {object, string} from "zod";
import bcrypt from "bcrypt";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";
import {serializeForClient} from "@/app/_lib/util/prisma";

const toClient = <T>(value: T) => serializeForClient(value);

// Action to update site users
export async function upsertSiteUserAction(userData: Partial<SiteUser>): Promise<GenericActionsType<SiteUser>> {
    after(() => {
        serverLogger.flush();
    });
    const session = await auth();

    if (session && session.user) {
        const currUser = await getUserByID(session.user.id);
        if (currUser) {
            if (currUser.role_id != 1) {
                return toClient({failure: "Unauthorized"});
            }
        }
    }

    const {success, data, error} = siteUserSchemaWithOptionalID.safeParse(userData);

    if (!success) {
        return toClient({
            // errors: Object.fromEntries(error.errors.entries())
            errors: error?.format()
        });
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

        return toClient({
            success: res
        });
    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[register]", {error});
            if (error.code == "P2002") {
                return toClient({failure: "Alamat email telah terdaftar"});
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[register]", {error});
        }

        return toClient({failure: "Update unsuccessful"});
    }
}

export async function deleteUserAction(id: string): Promise<GenericActionsType<Pick<SiteUser, "id">>> {
    after(() => {
        serverLogger.flush();
    });
    const session = await auth();

    if (session && session.user) {
        const currUser = await getUserByID(session.user.id);
        if (currUser) {
            if (currUser.role_id != 1) {
                return toClient({failure: "Unauthorized"});
            }
        }
    }

    const {success, error, data} = object({id: string().min(1, "ID is required")}).safeParse({
        id: id
    });

    if (!success) {
        return toClient({
            errors: error?.format()
        });
    }

    try {
        let res = await deleteUser(data!.id);

        return toClient({
            success: res
        });
    } catch (error) {
        serverLogger.error("[deleteUserAction]", {error, user_id: id});

        return toClient({
            failure: "error"
        });
    }
}
