import bcrypt from "bcryptjs";
import { siteUrl } from "@/lib/env";
import { sendEmail, emailConfigured } from "@/lib/email";
import { resetPasswordEmail, verifyEmail } from "@/lib/email-templates";
import { createAuthToken } from "@/lib/tokens";

export const BCRYPT_COST = 12;
export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);

/** A password problem in plain words, or null when it is fine. bcrypt only reads the first 72 bytes. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string") return "Enter a password.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (Buffer.byteLength(password) > 72) return "Password is too long (72 bytes at most).";
  return null;
}

/** Emails a "confirm your address" link. Returns false when email isn't set up or sending failed. */
export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  if (!emailConfigured()) return false;
  const token = await createAuthToken(user.id, "verify");
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: user.email, ...verifyEmail(user.name, url) });
}

/** Emails a password-reset link. In development without a provider the link is printed to the console. */
export async function sendResetEmail(user: { id: string; name: string; email: string }) {
  const token = await createAuthToken(user.id, "reset");
  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: user.email, ...resetPasswordEmail(user.name, url) });
}
