import nodemailerClient from "@/app/_lib/mailer";
import prisma from "@/app/_lib/primsa";
import {SettingsKey} from "@/app/_enum/setting";
import pLimit from "p-limit";
import {generateBillEmailReminders} from "@/app/api/(internal)/tasks/email/invoice-reminder/invoice-reminder-action";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Only allows endpoint to be called by vercel cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', {
            status: 401,
        });
    }

    let emailReminderEnabled = await prisma.setting.findFirst({
        where: {
            setting_key: SettingsKey.MONTHLY_INVOICE_EMAIL_REMINDER_ENABLED
        }
    });

    if (!emailReminderEnabled || emailReminderEnabled.setting_value?.toLowerCase() === "false") {
        return new Response('Forbidden', { status: 403 });
    }

    let allEmailToBeSent = await generateBillEmailReminders();

    if (allEmailToBeSent.length > 0) {
        let sent = 0;
        const limit = pLimit(14);
        const emailPromises = allEmailToBeSent.map(email => limit(async () => {
            try {
                await nodemailerClient.sendMail({
                    ...email,
                    from: {
                        name: "MICASA Suites",
                        address: "noreply@micasasuites.com",
                    },
                    subject: "Peringatan Untuk Membayar Tagihan",
                });
                sent++;
            } catch (error) {
                console.error(`Error sending email to ${email.to}.`, error);
            }
        }));
        await Promise.all(emailPromises);

        return Response.json({
            success: true,
            stats: {
                sent,
                target: allEmailToBeSent.length
            }
        });
    }

    return Response.json({success: true, message: "No Emails Sent"});
}