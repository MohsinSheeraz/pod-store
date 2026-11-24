import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <p className="error-text">This link is missing its code. Open the link from your email again.</p>
          <p className="auth-alt">
            <Link href="/forgot-password">Ask for a new link</Link>
          </p>
        </>
      )}
    </div>
  );
}
