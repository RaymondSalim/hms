"use server";

import nodemailerClient from "@/app/_lib/mailer";
import {emailSchema} from "@/app/_lib/zod/email/zod";
import {getToken} from "@auth/core/jwt";
import {serverLogger, withAxiom} from "@/app/_lib/axiom/server";
import {after} from "next/server";

export const POST = withAxiom(async (request: Request) => {
    after(() => {
        serverLogger.flush();
    });

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
    try {
        resp = await nodemailerClient.sendMail({
            subject: data?.subject,
            to: data?.to,
            text: data?.body
        });
    } catch (error) {
        serverLogger.error("[api/debug/email]", {error});
        if (error instanceof Error) {
            return Response.json({status: 500, message: error.message});
        }
    }

    return Response.json({
        status: 200,
        response: resp
    });

});
