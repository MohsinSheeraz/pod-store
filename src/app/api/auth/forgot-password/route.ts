import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isEmail, sendResetEmail } from "@/lib/auth-utils";

// Always answers the same way, so it can't be used to find out which emails have an account.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const ip = await rateLimit(`forgot-ip:${clientIp(req.headers)}`, { limit: 10, windowSec: 3600 });
  if (!ip.ok) return tooManyRequests(ip.retryAfter);

  if (isEmail(email)) {
    const perEmail = await rateLimit(`forgot:${email}`, { limit: 3, windowSec: 3600 });
    if (perEmail.ok) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        sendResetEmail(user).catch((e) => console.error("Reset email failed:", e));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
