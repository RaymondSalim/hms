"use server";

import {resetSchema} from "@/app/_lib/zod";
import {findUserByEmail} from "@/app/_db/user";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";

export type ResetPasswordType = {
    success?: string,
    failure?: string,
    errors?: {
        email?: string,
    }
}

export async function resetPassword(prevState: ResetPasswordType, formData: FormData): Promise<ResetPasswordType> {
    const {success, data, error} = resetSchema.safeParse({
        email: formData.get('email'),
    });

    if (!success) {
        return {
            errors: Object.fromEntries(error.errors.entries())
        };
    }

    const existing = await findUserByEmail(data.email);
    if (!existing) {
        return {
            success: "success"
        };
    }

    // TODO! Implementation
    try {

    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[register]", error.code, error.message);
            if (error.code == "P2002") {

            }
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[register]", error.message);
        }
    }

    return { success: "success" };
}
