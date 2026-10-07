import nodemailer, { type Transporter } from "nodemailer";
import { logEmail } from "@/lib/db/email-log";

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  readonly name: string;
  send(msg: OutboundEmail): Promise<{ delivered: boolean; error?: string }>;
}

/** No SMTP credentials: never pretends to send. Callers record status `stubbed`. */
class UnavailableEmailSender implements EmailSender {
  readonly name = "unavailable";
  async send(): Promise<{ delivered: boolean; error?: string }> {
    return { delivered: false, error: "smtp_not_configured" };
  }
}

class GmailSmtpSender implements EmailSender {
  readonly name = "gmail-smtp";
  private transport: Transporter;

  constructor() {
    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
      },
    });
  }

  async send(msg: OutboundEmail): Promise<{ delivered: boolean; error?: string }> {
    try {
      await this.transport.sendMail({
        from: process.env.SMTP_USER as string,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      });
      return { delivered: true };
    } catch (err) {
      return { delivered: false, error: err instanceof Error ? err.message : "smtp_error" };
    }
  }
}

let cached: EmailSender | null = null;

/**
 * Whether a real mail transport exists. Reads env directly rather than going
 * through `getEmailSender`, whose sender is cached — callers that need to
 * re-evaluate after changing env (tests, the inline outbox drain) must not be
 * served a stale answer.
 */
export function isEmailTransportConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

export function getEmailSender(): EmailSender {
  if (cached) return cached;
  cached = isEmailTransportConfigured()
    ? new GmailSmtpSender()
    : new UnavailableEmailSender();
  return cached;
}

/**
 * Send + record in email_log in one step. Never throws: a failed or missing
 * email is logged (`sent` / `stubbed` / `failed`) so the admin console can
 * show exactly what happened. Never includes card or payment-phone data.
 */
export async function sendAndLog(
  template: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ delivered: boolean; status: "sent" | "stubbed" | "failed" }> {
  const sender = getEmailSender();
  const result = await sender.send({ to, subject, text: body });
  const status: "sent" | "stubbed" | "failed" = result.delivered
    ? "sent"
    : result.error === "smtp_not_configured"
      ? "stubbed"
      : "failed";
  await logEmail({ to, template, subject, body, status, error: result.error });
  return { delivered: result.delivered, status };
}
