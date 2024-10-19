"use server";

import {resetSchema} from "@/app/_lib/zod/auth/zod";
import {findUserByEmail} from "@/app/_db/user";
import {PrismaClientKnownRequestError, PrismaClientUnknownRequestError} from "@prisma/client/runtime/library";
import {generateRandomPassword} from "@/app/_lib/util";
import prisma from "@/app/_lib/primsa";
import bcrypt from "bcrypt";
import nodemailerClient, {EMAIL_TEMPLATES, withTemplate} from "@/app/_lib/mailer";

type ResetPasswordType = {
    success?: string,
    failure?: string,
    errors?: {
        email?: string,
    }
}

export async function resetPasswordAction(prevState: ResetPasswordType, formData: FormData): Promise<ResetPasswordType> {
    const {success, data, error} = resetSchema.safeParse({
        email: formData.get('email'),
    });

    if (!success) {
        return {
            errors: Object.fromEntries(error.errors.entries())
        };
    }

    const existing = await findUserByEmail(data.email);
    if (existing == null) {
        return {
            success: "If a user account exists with that email, we will send you a reset email."
        };
    }

    try {
        // Generate random password
        await prisma.$transaction(async (tx) => {
            const newPassword = generateRandomPassword(8);
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await tx.siteUser.update({
                where: {
                    id: existing.id
                },
                data: {
                    id: undefined,
                    password: hashedPassword,
                    shouldReset: true
                }
            });

            let emailTemplate = await withTemplate(EMAIL_TEMPLATES.RESET_PASSWORD, existing.email, newPassword);

            await nodemailerClient.sendMail({
                to: data?.email,
                subject: "MICASA Suites - Pengaturan Ulang Kata Sandi",
                text: emailTemplate
            });
        });

    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            console.error("[resetPasswordAction]", error.code, error.message);
            if (error.code == "P2002") {

            }
            return {
                failure: "Internal Server Error",
            };
        } else if (error instanceof PrismaClientUnknownRequestError) {
            console.error("[resetPasswordAction]", error.message);
        }
    }

    return {success: "success"};
}
