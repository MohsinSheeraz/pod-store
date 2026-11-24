"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, accepted }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    toast.success(
      data.verifyEmail ? "Account created. Check your email to confirm it, then log in." : "Account created. Log in to continue."
    );
    router.push("/login");
  }

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="hint">At least 8 characters.</span>
        </div>
        <label className="check">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and the <Link href="/privacy">Privacy Policy</Link>.
          </span>
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="auth-alt">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
