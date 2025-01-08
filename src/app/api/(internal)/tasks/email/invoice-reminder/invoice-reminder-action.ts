import {PartialBy} from "@/app/_db/db";
import {Options} from "nodemailer/lib/mailer";
import {getUpcomingUnpaidBillsWithUsersByDate} from "@/app/(internal)/(dashboard_layout)/bills/bill-action";
import {EMAIL_TEMPLATES, withTemplate} from "@/app/_lib/mailer";
import {formatToDateTime, formatToIDR} from "@/app/_lib/util";

export async function generateBillEmailReminders(targetDate: Date = new Date()) {
    const pageSize = 50;
    let page = 0;
    let hasMoreData = true;

    let allEmailToBeSent: PartialBy<Options, "from" | "subject">[] = [];

    while (hasMoreData) {
        const {
            bills,
        } = await getUpcomingUnpaidBillsWithUsersByDate(targetDate, pageSize, page * pageSize);

        for (let bill of bills) {
            const tenant = bill.bookings.tenants;
            if (!tenant) continue;
            if (!tenant.email) continue;

            const billAmount = (bill.bill_item ?? []).reduce((prev, bi) => bi.amount.toNumber() + prev, 0);
            const template = await withTemplate(
                EMAIL_TEMPLATES.BILL_REMINDER,
                tenant.name,
                bill.id.toString(),
                formatToIDR(billAmount),
                formatToDateTime(bill.due_date),
            );

            allEmailToBeSent.push({
                to: tenant.email,
                text: template,
            });
        }

        if (bills.length < pageSize) {
            hasMoreData = false;
        } else {
            page++;
        }
    }

    return allEmailToBeSent;
}