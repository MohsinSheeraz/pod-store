import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createCheckoutSession, createRefund, verifyWebhookSignature } from "@/lib/stripe";

const secret = "whsec_test_secret";
const body = '{"id":"evt_1","type":"checkout.session.completed"}';
const sign = (t: number, payload = body, key = secret) =>
  `t=${t},v1=${createHmac("sha256", key).update(`${t}.${payload}`).digest("hex")}`;

test("a correctly signed, fresh webhook is accepted", () => {
  const now = 1_700_000_000;
  assert.equal(verifyWebhookSignature(body, sign(now), secret, 300, now), true);
  assert.equal(verifyWebhookSignature(body, sign(now), secret, 300, now + 299), true);
});

test("a changed body, wrong secret, stale or missing signature is rejected", () => {
  const now = 1_700_000_000;
  assert.equal(verifyWebhookSignature(body + " ", sign(now), secret, 300, now), false);
  assert.equal(verifyWebhookSignature(body, sign(now, body, "other"), secret, 300, now), false);
  assert.equal(verifyWebhookSignature(body, sign(now), secret, 300, now + 301), false);
  assert.equal(verifyWebhookSignature(body, null, secret, 300, now), false);
  assert.equal(verifyWebhookSignature(body, "garbage", secret, 300, now), false);
  assert.equal(verifyWebhookSignature(body, `t=${now}`, secret, 300, now), false);
  assert.equal(verifyWebhookSignature(body, `t=abc,v1=00`, secret, 300, now), false);
});

test("any one matching v1 signature is enough (Stripe sends several while rotating secrets)", () => {
  const now = 1_700_000_000;
  const good = sign(now).split(",")[1];
  assert.equal(verifyWebhookSignature(body, `t=${now},v1=deadbeef,${good}`, secret, 300, now), true);
});

// ---- the requests we send ----------------------------------------------------------------------

type Sent = { url: string; init: RequestInit };
function stubFetch(response: unknown) {
  const sent: Sent[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    return new Response(JSON.stringify(response), { status: 200 });
  }) as typeof fetch;
  return { sent, restore: () => (globalThis.fetch = original) };
}

test("createCheckoutSession sends the order, amount and redirect addresses to Stripe", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  const stub = stubFetch({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
  try {
    const session = await createCheckoutSession({
      orderId: "ord_1",
      reference: "#ABC12345",
      amountCents: 2699,
      email: "a@b.co",
      successUrl: "https://shop.test/orders/ord_1?placed=1",
      cancelUrl: "https://shop.test/orders/ord_1?canceled=1",
    });
    assert.equal(session.id, "cs_1");

    const { url, init } = stub.sent[0];
    assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer sk_test_123");
    const form = new URLSearchParams(String(init.body));
    assert.equal(form.get("mode"), "payment");
    assert.equal(form.get("client_reference_id"), "ord_1");
    assert.equal(form.get("line_items[0][price_data][unit_amount]"), "2699");
    assert.equal(form.get("line_items[0][price_data][currency]"), "usd");
    assert.equal(form.get("success_url"), "https://shop.test/orders/ord_1?placed=1");
    assert.equal(form.get("customer_email"), "a@b.co");
  } finally {
    stub.restore();
    delete process.env.STRIPE_SECRET_KEY;
  }
});

test("createRefund is idempotent through its key", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  const stub = stubFetch({ id: "re_1", status: "succeeded" });
  try {
    await createRefund("pi_123", "refund-ord_1");
    const { url, init } = stub.sent[0];
    assert.equal(url, "https://api.stripe.com/v1/refunds");
    assert.equal((init.headers as Record<string, string>)["Idempotency-Key"], "refund-ord_1");
    assert.equal(new URLSearchParams(String(init.body)).get("payment_intent"), "pi_123");
  } finally {
    stub.restore();
    delete process.env.STRIPE_SECRET_KEY;
  }
});

test("a Stripe error becomes a thrown error with its message", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "No such payment_intent" } }), { status: 404 })) as typeof fetch;
  try {
    await assert.rejects(() => createRefund("pi_x", "k"), /No such payment_intent/);
  } finally {
    globalThis.fetch = original;
    delete process.env.STRIPE_SECRET_KEY;
  }
});
