import type { ReactNode } from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <Link href="/" className="brand auth-brand">
        {SITE.name}
      </Link>
      {children}
    </div>
  );
}
