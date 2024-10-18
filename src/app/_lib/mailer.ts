import * as aws from "@aws-sdk/client-ses";
import {SESServiceException} from "@aws-sdk/client-ses";
import nodemailer from 'nodemailer';
import {Address, Options} from "nodemailer/lib/mailer";
import prisma from "@/app/_lib/primsa";
import {PartialBy} from "@/app/_db/db";

enum EmailStatus {
    SUCCESS = "SUCCESS",
    FAIL_CLIENT = "FAIL_CLIENT",
    FAIL_SERVER = "FAIL_SERVER",
}

class NodemailerSingleton {
    private static instance: NodemailerSingleton;
    private client: nodemailer.Transporter;

    private static DEFAULT_FROM: Address = {
        name: "MICASA Suites",
        address: "noreply@micasasuites.com"
    };

    private constructor() {
        const ses = new aws.SES({
            region: "ap-southeast-1",
        });

        this.client = nodemailer.createTransport({
            SES: { ses, aws },
            sendingRate: 14,
        });
    }


    public static getInstance(): NodemailerSingleton {
        if (!NodemailerSingleton.instance) {
            NodemailerSingleton.instance = new NodemailerSingleton();
        }
        return NodemailerSingleton.instance;
    }

    public async sendMail(mailOptions: PartialBy<Options, "from">) {
        mailOptions.from = mailOptions.from ?? NodemailerSingleton.DEFAULT_FROM;
        try {
            const response = await this.client.sendMail({});
            await prisma.emailLogs.create({
                data: {
                    status: EmailStatus.SUCCESS,
                    from: fromToStringArray(mailOptions.from).join(", "),
                    to: toToStringArray(mailOptions.to).join(", "),
                    subject: mailOptions.subject,
                    payload: JSON.stringify(response),
                },
            });
            return response;
        } catch (error) {
            console.error(error);
            let errBlame = EmailStatus.FAIL_CLIENT;
            if (error instanceof SESServiceException) {
                if (error.$fault == "server") {
                    errBlame = EmailStatus.FAIL_SERVER;
                }
            }
            await prisma.emailLogs.create({
                data: {
                    status: errBlame,
                    from: fromToStringArray(mailOptions.from).join(", "),
                    to: toToStringArray(mailOptions.to).join(", "),
                    subject: mailOptions.subject,
                    payload: JSON.stringify(error),
                },
            });
            throw error;
        }
    }
}

function isAddressInterface(obj: any): obj is Address {
    return typeof obj.name == "string" && typeof obj.address == "string";
}

function fromToStringArray(from: Options['from']) {
    let addr = [];
    if (typeof from == "string") {
        addr.push(from);
    } else if (isAddressInterface(from)) {
        addr.push(from.address);
    }

    return addr;
}

function toToStringArray(to: Options['to']) {
    let addr: string[] = [];

    const addAddress = (item: typeof to) => {
        if (typeof item === "string") {
            addr.push(item);
        } else if (isAddressInterface(item)) {
            addr.push(item.address);
        } else if (Array.isArray(item)) {
            item.forEach(addAddress);
        }
    };

    addAddress(to);

    return addr;
}

// Usage
const nodemailerClient = NodemailerSingleton.getInstance();

export default nodemailerClient;