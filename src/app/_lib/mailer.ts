import {SendEmailCommand, SESv2Client, SESv2ServiceException} from "@aws-sdk/client-sesv2";
import nodemailer from 'nodemailer';
import {Address, Options} from "nodemailer/lib/mailer";
import prisma from "@/app/_lib/primsa";
import {PartialBy} from "@/app/_db/db";
import * as util from "node:util";
import {serverLogger} from "@/app/_lib/axiom/server";
import {after} from "next/server";

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
        if (process.env.NODE_ENV == "production") {
            const sesClient = new SESv2Client({
                region: "ap-southeast-1",
            });

            this.client = nodemailer.createTransport({
                SES: {sesClient, SendEmailCommand},
                sendingRate: 14,
            });
        } else {
            this.client = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: 'nora56@ethereal.email',
                    pass: 'S4dvJJZJfGCB6P9V7T'
                }
            });
        }
    }

    public static getInstance(): NodemailerSingleton {
        if (!NodemailerSingleton.instance) {
            NodemailerSingleton.instance = new NodemailerSingleton();
        }
        return NodemailerSingleton.instance;
    }

    public async sendMail(mailOptions: PartialBy<Options, "from">) {
        after(() => {
            serverLogger.flush();
        });
        mailOptions.from = mailOptions.from ?? NodemailerSingleton.DEFAULT_FROM;
        try {
            const response = await this.client.sendMail(mailOptions);
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
            serverLogger.error("[sendMail]", {error});
            let errBlame = EmailStatus.FAIL_CLIENT;
            if (error instanceof SESv2ServiceException) {
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

export enum EMAIL_TEMPLATES {
    RESET_PASSWORD = "RESET_PASSWORD",
    BILL_REMINDER = "BILL_REMINDER",
    _NO_REPLY_DISCLAIMER = "_NO_REPLY_DISCLAIMER",
}

// TODO! Remove hardcode
const TEMPLATES_MAPPING: {
    [key in EMAIL_TEMPLATES]: string
} = {
    RESET_PASSWORD: `
    Kami telah menerima permintaan untuk mengatur ulang kata sandi Anda.
    Silahkan masuk menggunakan informasi berikut:
            Email:\t\t\t\t%s
            Password:\t\t\t%s
        
    Terima Kasih,
    MICASA Suites
    `,
    BILL_REMINDER: `
    Yth. %s,

    Kami ingin mengingatkan bahwa tagihan %s sebesar %s jatuh tempo pada %s. Mohon segera lakukan pembayaran sebelum tanggal tersebut.
    
    Pembayaran dapat dilakukan melalui transfer ke rekening dibawah:
    BCA 
    5491118777 
    Adriana Nugroho
    
    Jika pembayaran sudah dilakukan, harap abaikan email ini.

    Terima kasih,
    MICASA Suites   
    `,
    _NO_REPLY_DISCLAIMER: `
    
    Email ini tidak dipantau. 
    Jika Anda memiliki pertanyaan atau kebutuhan, silakan hubungi nomor telepon MICASA Suites.
    
    +62 811-1234-777
    Jalan Puskesmas No.35-22, Cengkareng, Jakarta Raya, Indonesia 11750
    `
};

export async function withTemplate(template: EMAIL_TEMPLATES, ...args: string[]): Promise<string> {
    if (TEMPLATES_MAPPING[template]) {
        let emailText = util.format(TEMPLATES_MAPPING[template], ...args);
        emailText = emailText.concat(TEMPLATES_MAPPING[EMAIL_TEMPLATES._NO_REPLY_DISCLAIMER]);
        return emailText;
    }

    throw new Error("template not found");
}
