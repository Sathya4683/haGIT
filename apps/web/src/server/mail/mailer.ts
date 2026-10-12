import nodemailer, { type Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

let transporter: Transporter | null = null;

export function mailConfigured() {
    return Boolean(process.env.SMTP_HOST);
}

function getTransporter(): Transporter {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT || 587);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
            connectionTimeout: 10_000,
            socketTimeout: 20_000,
        });
    }
    return transporter;
}

export async function sendMail(message: Omit<Mail.Options, "from">) {
    if (!mailConfigured()) throw new Error("SMTP is not configured (SMTP_HOST is empty)");
    const from = process.env.MAIL_FROM || process.env.SMTP_USER || "haGIT <no-reply@hagit.local>";
    return getTransporter().sendMail({ from, ...message });
}
