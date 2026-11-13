"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CheckoutForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: defaultName,
    phone: "",
    line1: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipping: form }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      toast.success("Order placed.");
      router.push(`/orders/${data.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form checkout-form">
      <h2>Shipping details</h2>

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" type="text" autoComplete="name" value={form.name} onChange={set("name")} required />
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} required />
      </div>

      <div className="field">
        <label htmlFor="line1">Address</label>
        <input id="line1" type="text" autoComplete="street-address" value={form.line1} onChange={set("line1")} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" type="text" autoComplete="address-level2" value={form.city} onChange={set("city")} required />
        </div>
        <div className="field">
          <label htmlFor="postalCode">Postal code</label>
          <input id="postalCode" type="text" autoComplete="postal-code" value={form.postalCode} onChange={set("postalCode")} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="country">Country</label>
        <input id="country" type="text" autoComplete="country-name" value={form.country} onChange={set("country")} required />
      </div>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}