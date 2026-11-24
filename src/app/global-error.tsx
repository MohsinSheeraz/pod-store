"use client";

// The last safety net: used only if the root layout itself fails, so it can't rely on the
// site's styles or components.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f8f9fa",
          color: "#1f2e4a",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 8px" }}>Something went wrong.</h1>
          <p style={{ margin: "0 0 20px", color: "#495057" }}>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{
              padding: "12px 22px",
              borderRadius: 999,
              border: 0,
              background: "#1f2e4a",
              color: "#f8f9fa",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
