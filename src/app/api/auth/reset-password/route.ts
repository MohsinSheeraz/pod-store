import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { hashPassword, passwordProblem } from "@/lib/auth-utils";
import { consumeAuthToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const limit = await rateLimit(`reset:${clientIp(req.headers)}`, { limit: 20, windowSec: 3600 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { token?: unknown; password?: unknown };
  const token = typeof body.token === "string" ? body.token : "";

  const problem = passwordProblem(body.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const userId = await consumeAuthToken(token, "reset");
  if (!userId) {
    return NextResponse.json(
      { error: "This link is invalid or has expired. Ask for a new one." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await hashPassword(body.password as string),
      // They proved they own the address.
      emailVerified: new Date(),
    },
  });
  // Any other reset links from earlier requests stop working.
  await prisma.authToken.deleteMany({ where: { userId, type: "reset" } });

  return NextResponse.json({ ok: true });
}
