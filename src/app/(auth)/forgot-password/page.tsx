"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError("Too many requests. Please try again later.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Forgot your password?</h1>
      {done ? (
        <>
          <p>
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to choose a new password. It
            works for one hour.
          </p>
          <p className="auth-alt">
            <Link href="/login">Back to log in</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <p className="hint">Enter your email and we&apos;ll send you a reset link.</p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <p className="auth-alt">
            <Link href="/login">Back to log in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
