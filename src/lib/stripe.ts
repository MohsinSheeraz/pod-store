import { createHmac, timingSafeEqual } from "crypto";
import { pricingConfig } from "@/lib/env";

// A minimal Stripe client over fetch (no SDK): create a Checkout Session, read one back, and
// verify webhook signatures. Docs: https://docs.stripe.com/api/checkout/sessions

const API = "https://api.stripe.com/v1";

export type StripeSession = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired" | null;
  client_reference_id: string | null;
  payment_intent: string | null;
};

function secretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } }).error?.message ?? `Stripe error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export type CheckoutInput = {
  orderId: string;
  reference: string; // short order reference shown to the customer
  amountCents: number;
  email?: string | null;
  successUrl: string;
  cancelUrl: string;
};

/** Starts a hosted Stripe Checkout for one order. The shopper pays on Stripe's page. */
export function createCheckoutSession(input: CheckoutInput) {
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", input.successUrl);
  form.set("cancel_url", input.cancelUrl);
  form.set("client_reference_id", input.orderId);
  form.set("metadata[orderId]", input.orderId);
  form.set("payment_intent_data[metadata][orderId]", input.orderId);
  if (input.email) form.set("customer_email", input.email);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", pricingConfig().currency);
  form.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  form.set("line_items[0][price_data][product_data][name]", `Order ${input.reference}`);
  return call<StripeSession>("/checkout/sessions", { method: "POST", body: form });
}

export const retrieveSession = (id: string) =>
  call<StripeSession>(`/checkout/sessions/${encodeURIComponent(id)}`);

/** Refunds a payment in full. The idempotency key makes a repeated call refund only once. */
export function createRefund(paymentIntent: string, idempotencyKey: string) {
  const form = new URLSearchParams();
  form.set("payment_intent", paymentIntent);
  return call<{ id: string; status: string }>("/refunds", {
    method: "POST",
    body: form,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

/** Closes an unpaid Checkout page so it can't be paid after the order was cancelled. */
export function expireSession(id: string) {
  return call<StripeSession>(`/checkout/sessions/${encodeURIComponent(id)}/expire`, {
    method: "POST",
    body: new URLSearchParams(),
  });
}

/**
 * Checks a webhook's `Stripe-Signature` header against the raw request body.
 * Returns true only for a fresh, correctly signed event.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000)
) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || signatures.length === 0) return false;
  if (!/^\d+$/.test(t) || Math.abs(nowSec - Number(t)) > toleranceSec) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
