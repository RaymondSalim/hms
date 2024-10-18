import nodemailerClient from "@/app/_lib/mailer";
import {getUpcomingUnpaidBillsWithUsersByDate} from "@/app/(internal)/bills/bill-action";

export const maxDuration = 60; // This function can run for a maximum of 5 seconds

export async function GET(request: Request) {
    // Only allows endpoint to be called by vercel cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', {
            status: 401,
        });
    }

    const pageSize = 10;
    let page = 0;
    let hasMoreData = true;
    let total = 0;
    let processed = 0;

    let allEmails: string[] = [];

    while (hasMoreData) {
        const {
            bills,
            total: billsCount
        } = await getUpcomingUnpaidBillsWithUsersByDate(new Date(), pageSize, page * pageSize);
        total = billsCount;

        // @ts-expect-error tenants type
        const emails = bills.bills.flatMap(b => (b.bookings.tenants?.email) ?? []);
        processed += emails.length;
        allEmails = allEmails.concat(emails);

        if (processed == total) {
            break;
        }
    }

    if (allEmails.length > 0) {
        // @ts-ignore
        const uniqueEmails = [...new Set(allEmails)];
        try {
            await nodemailerClient.sendMail({
                from: {
                    name: "MICASA Suites",
                    address: "noreply@micasasuites.com"
                },
                to: uniqueEmails,
                subject: "Peringatan Pembayaran",
                text: "Mohon bayar."
            });
        } catch (error) {
            console.error(error);
            return Response.json({success: false, message: "Internal Server Error Occurred"});
        }

        return Response.json({success: true});
    }

    return Response.json({success: true, message: "No Emails Sent"});
}