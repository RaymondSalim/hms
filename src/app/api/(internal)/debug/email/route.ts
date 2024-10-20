"use server";

import nodemailerClient from "@/app/_lib/mailer";
import {emailSchema} from "@/app/_lib/zod/email/zod";
import {getToken} from "@auth/core/jwt";

export async function POST(request: Request) {
    // @ts-expect-error
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET as string
    });
    if (!token) {
        return Response.json({status: 401, message: "Not Authorized"});
    }

    const jsonReq = await request.json();

    const {success, data, error} = emailSchema.safeParse(jsonReq);

    if (error || !success) {
        return Response.json({status: 400, message: error.message});
    }
    let resp;
    // TODO! Replace values
    try {
        resp = await nodemailerClient.sendMail({
            subject: data?.subject,
            to: data?.to,
            text: data?.body
        });
    } catch (e) {
        console.error(e);
        if (e instanceof Error) {
            return Response.json({status: 500, message: e.message});
        }
    }

    return Response.json({
        status: 200,
        response: resp
    });
}