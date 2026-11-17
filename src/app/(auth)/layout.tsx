import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="auth-brand" aria-label="Home">
        <Logo />
      </Link>
      {children}
    </div>
  );
}
