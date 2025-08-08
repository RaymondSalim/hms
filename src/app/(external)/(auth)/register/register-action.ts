"use server";

import {registerSchema} from "@/app/_lib/zod/auth/zod";
import {createUser, findUserByEmail} from "@/app/_db/user";
import bcrypt from "bcrypt";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {after} from "next/server";
import {serverLogger} from "@/app/_lib/axiom/server";

export type ResetUserType = {
    success?: string,
    failure?: string,
    errors?: {
        email?: string,
        password?: string,
        name?: string,
    }
}

export async function registerUser(prevState: ResetUserType, formData: FormData): Promise<ResetUserType> {
    after(() => {
        serverLogger.flush();
    });
    const {success, data, error} = registerSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
        name: formData.get('name'),
    });

    if (!success) {
        return {
            errors: Object.fromEntries(error.errors.entries())
        };
    }

    const existing = await findUserByEmail(data.email);
    if (existing) {
        return {
            failure: "Alamat email sudah terdaftar"
        };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
        await createUser({
            email: data!.email,
            password: hashedPassword,
            name: data!.name,
            shouldReset: false,
            role_id: 1, // TODO! Dynamic
        });
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            serverLogger.error("[register]", {error});
            if (error.code == "P2002") {
                return { failure: "Alamat email sudah terdaftar" };
            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            serverLogger.error("[register]", {error});
        }

        return { failure: "Registrasi tidak berhasil" };
    }

    return { success: "Registrasi berhasil" };
}
