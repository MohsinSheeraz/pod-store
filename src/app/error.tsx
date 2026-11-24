"use client";

import Link from "next/link";

// Shown when something on a page fails. The real error goes to the server log (see
// src/instrumentation.ts); the shopper just sees a calm message and a way forward.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container status-page">
      <p className="status-code">Oops</p>
      <h1>Something went wrong.</h1>
      <p className="hint">
        We couldn&apos;t load this page. Try again, and if it keeps happening let us know
        {error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <div className="status-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </div>
  );
}
