import {getToken} from "@auth/core/jwt";
import {generateBillEmailReminders} from "@/app/api/(internal)/tasks/email/invoice-reminder/invoice-reminder-action";
import {withAxiom} from "@/app/_lib/axiom/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export const GET = withAxiom(async (request: Request) => {
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET as string
    });
    if (!token) {
        return Response.json({status: 401, message: "Not Authorized"});
    }

    const reqUrl = request.url;
    const { searchParams } = new URL(reqUrl);

    let date;
    if (searchParams.has("start_date")) {
        date = new Date(searchParams.get("start_date")!);
    }

    const emails = await generateBillEmailReminders(date);

    if (emails.length > 0) {
        emails.map(e => ({
            ...e,
            from: {
                name: "MICASA Suites",
                address: "noreply@micasasuites.com",
            },
            subject: "Peringatan Untuk Membayar Tagihan",
        }));

        return Response.json({
            success: true,
            emails: emails
        });
    }

    return Response.json({success: true, message: "No Emails to be sent"});
});
