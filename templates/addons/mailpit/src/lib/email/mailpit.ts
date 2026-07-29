import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST ?? "localhost";
const smtpPort = Number(process.env.SMTP_PORT ?? 1025);
const smtpUser = process.env.SMTP_USER ?? undefined;
const smtpPass = process.env.SMTP_PASSWORD ?? undefined;

let transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
  secure: false,
});

export async function sendMail({ to, subject, html, text }: { to: string; subject: string; html?: string; text?: string; }) {
  const info = await transporter.sendMail({
    to,
    subject,
    html,
    text,
    from: process.env.SMTP_FROM ?? "noreply@example.com",
  });
  return info;
}
