import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  if (token) {
    const userId = await consumeAuthToken(token, "verify");
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
      ok = true;
    }
  }

  return (
    <div className="auth-card">
      {ok ? (
        <>
          <h1>Email confirmed</h1>
          <p>Thanks, your address is confirmed. You can place orders now.</p>
          <Link href="/#products" className="btn btn-primary btn-block">
            Start designing
          </Link>
        </>
      ) : (
        <>
          <h1>Link not valid</h1>
          <p className="error-text">This confirmation link is invalid, already used or expired.</p>
          <p className="auth-alt">
            Log in and we&apos;ll offer to <Link href="/login">send you a new one</Link>.
          </p>
        </>
      )}
    </div>
  );
}
