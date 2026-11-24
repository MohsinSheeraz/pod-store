import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { hashPassword, isEmail, passwordProblem, sendVerificationEmail } from "@/lib/auth-utils";
import { emailConfigured } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(`signup:${clientIp(req.headers)}`, { limit: 8, windowSec: 3600 });
    if (!limit.ok) return tooManyRequests(limit.retryAfter, "Too many sign-ups from here. Try again later.");

    const body = (await req.json().catch(() => ({}))) as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      accepted?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name || !email || !body.password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (name.length > 80) {
      return NextResponse.json({ error: "Name is too long." }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const pw = passwordProblem(body.password);
    if (pw) return NextResponse.json({ error: pw }, { status: 400 });
    if (body.accepted !== true) {
      return NextResponse.json({ error: "Please accept the terms and privacy policy." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const verifyByEmail = emailConfigured();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(body.password as string),
        // Without an email provider there is no way to confirm an address, so don't block people.
        emailVerified: verifyByEmail ? null : new Date(),
      },
    });

    if (verifyByEmail) {
      sendVerificationEmail(user).catch((e) => console.error("Verification email failed:", e));
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email, verifyEmail: verifyByEmail },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
