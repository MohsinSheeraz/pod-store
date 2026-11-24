"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ResendVerification() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not send the email.");
        return;
      }
      setSent(true);
      toast.success("Confirmation email sent.");
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-primary" onClick={resend} disabled={busy || sent}>
      {sent ? "Email sent" : busy ? "Sending..." : "Resend confirmation email"}
    </button>
  );
}
