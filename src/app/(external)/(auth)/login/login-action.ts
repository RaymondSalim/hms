"use server";

import {signInSchema} from "@/app/_lib/zod/auth/zod";
import {signIn} from "@/app/_lib/auth/auth";
import {CredentialsSignin} from "next-auth";
import {isRedirectError} from "next/dist/client/components/redirect";

export type LoginUserType = {
    success?: string,
    shouldReset?: boolean,
    failure?: string
}

export async function loginUser(prevState: LoginUserType, formData: FormData): Promise<LoginUserType> {
    const validatedFields = signInSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    });

    if (!validatedFields.success) {
        return {
            failure: "Nama pengguna atau kata sandi tidak valid"
        };
    }

    try {
        await signIn("credentials", {
            redirect: false,
            ...Object.fromEntries(formData)
        });

        // TODO! User reset password
        // let user = await prisma.siteUser.findFirst({
        //     where: {
        //         email: validatedFields.data.email
        //     },
        //     select: {
        //         shouldReset: true
        //     }
        // });
        // if (user?.shouldReset) {
        //
        // }

        return { success: "Login berhasil", shouldReset: true, };
    } catch (error: any) {
        if (error.cause && error.cause.err instanceof CredentialsSignin) {
            return { failure: "Nama pengguna atau kata sandi tidak valid" };
        }
        if (isRedirectError(error)) {
            throw error;
        }
    }

    return { success: "Login berhasil" };
}
