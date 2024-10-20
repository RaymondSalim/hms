"use server";

import {signInSchema} from "@/app/_lib/zod/auth/zod";
import {signIn} from "@/app/_lib/auth";
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
            failure: "Invalid username or password"
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

        return { success: "Login successful", shouldReset: true, };
    } catch (error: any) {
        if (error.cause && error.cause.err instanceof CredentialsSignin) {
            return { failure: "Invalid username or password" };
        }
        if (isRedirectError(error)) {
            throw error;
        }
    }

    return { success: "Login successful" };
}
