import { isProduction } from "@/lib/env";

// Sends email through Resend (https://resend.com) over plain fetch.
//  - RESEND_API_KEY set: real emails.
//  - Not set in development: the email is printed to the server console, so sign-up, verification
//    and password-reset links can be followed without any provider.
//  - Not set in production: nothing is sent (see envProblems in src/lib/env.ts).

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export type Email = { to: string; subject: string; html: string; text: string };

export async function sendEmail(mail: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    if (!isProduction()) {
      console.info(`\n[email → ${mail.to}] ${mail.subject}\n${mail.text}\n`);
    }
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Pressroom <onboarding@resend.dev>",
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: process.env.SUPPORT_EMAIL || undefined,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("Email send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
