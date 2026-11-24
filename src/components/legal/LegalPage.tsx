import type { ReactNode } from "react";

// Shared layout for the policy pages. The banner is on purpose: these texts are a sensible
// starting point, not legal advice, and need a review for the countries the shop sells to.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="container legal">
      <h1>{title}</h1>
      <p className="hint">Last updated {updated}</p>
      <p className="legal-note">
        Template text: have it reviewed for your business and the countries you sell to before launch.
      </p>
      <div className="legal-body">{children}</div>
    </div>
  );
}
