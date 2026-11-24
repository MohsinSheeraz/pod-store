import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/auth-utils";
import { emailConfigured } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email isn't set up on this server." }, { status: 503 });
  }

  const limit = await rateLimit(`resend:${session.user.id}`, { limit: 5, windowSec: 3600 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  await sendVerificationEmail(user);
  return NextResponse.json({ ok: true });
}
