import { test } from "node:test";
import assert from "node:assert/strict";
import { envProblems, paymentMode, pricingConfig, siteUrl } from "@/lib/env";

const goodProd = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://x",
  AUTH_SECRET: "a".repeat(40),
  SITE_URL: "https://shop.example.com",
  AUTH_TRUST_HOST: "true",
  STRIPE_SECRET_KEY: "sk_live_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  S3_BUCKET: "b",
  RESEND_API_KEY: "re_x",
  UPSTASH_REDIS_REST_URL: "https://r",
  SUPPORT_EMAIL: "help@shop.example.com",
};

test("production without Stripe refuses to take orders instead of giving them away", () => {
  assert.equal(paymentMode({ NODE_ENV: "production" }), "disabled");
  assert.equal(paymentMode({ NODE_ENV: "production", STRIPE_SECRET_KEY: "sk_live_x" }), "stripe");
  assert.equal(paymentMode({ NODE_ENV: "development" }), "simulated");
  assert.equal(paymentMode({}), "simulated");
});

test("a fully configured production setup has no problems", () => {
  assert.deepEqual(envProblems(goodProd), { errors: [], warnings: [] });
});

test("unsafe production settings are errors", () => {
  const { errors } = envProblems({ NODE_ENV: "production", AUTH_SECRET: "short", SITE_URL: "http://x.com" });
  assert.equal(errors.length, 4, errors.join(" | ")); // db, secret, https, trusted host
  assert.ok(errors.some((e) => e.includes("DATABASE_URL")));
  assert.ok(errors.some((e) => e.includes("AUTH_SECRET")));
  assert.ok(errors.some((e) => e.includes("https")));
});

test("Stripe without a webhook secret is an error; missing optional services are warnings", () => {
  const { errors } = envProblems({ ...goodProd, STRIPE_WEBHOOK_SECRET: undefined });
  assert.ok(errors.some((e) => e.includes("STRIPE_WEBHOOK_SECRET")));

  const { errors: e2, warnings } = envProblems({
    ...goodProd,
    STRIPE_SECRET_KEY: undefined,
    S3_BUCKET: undefined,
    RESEND_API_KEY: undefined,
    UPSTASH_REDIS_REST_URL: undefined,
  });
  assert.deepEqual(e2, []);
  assert.equal(warnings.length, 4);
});

test("production needs a trusted host or login breaks", () => {
  const { AUTH_TRUST_HOST: _omit, ...without } = goodProd;
  void _omit;
  assert.ok(envProblems(without).errors.some((e) => e.includes("AUTH_TRUST_HOST")));
  assert.deepEqual(envProblems({ ...without, AUTH_URL: "https://shop.example.com" }).errors, []);
});

test("development is never blocked", () => {
  assert.deepEqual(envProblems({ NODE_ENV: "development" }), { errors: [], warnings: [] });
});

test("site url and pricing read the environment with sane defaults", () => {
  assert.equal(siteUrl({}), "http://localhost:3000");
  assert.equal(siteUrl({ SITE_URL: "https://a.com/" }), "https://a.com");
  assert.deepEqual(pricingConfig({}), { shippingFlat: 4.99, freeShippingOver: 75, taxRate: 0, currency: "usd" });
  assert.equal(pricingConfig({ SHIPPING_FLAT: "7.5", TAX_RATE: "0.2" }).shippingFlat, 7.5);
  assert.equal(pricingConfig({ SHIPPING_FLAT: "oops" }).shippingFlat, 4.99);
  assert.equal(pricingConfig({ TAX_RATE: "-1" }).taxRate, 0);
});
