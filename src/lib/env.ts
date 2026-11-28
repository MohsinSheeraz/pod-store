// Everything the app reads from the environment, in one place, with safe defaults.
// See docs/DEPLOYMENT.md for what each variable does.

type Env = Record<string, string | undefined>;

export const isProduction = (env: Env = process.env) => env.NODE_ENV === "production";

export type PaymentMode = "stripe" | "simulated" | "disabled";

/**
 * How checkout takes payment.
 *  - stripe:    real payments (STRIPE_SECRET_KEY is set)
 *  - simulated: development only, orders are marked paid instantly and nobody is charged
 *  - disabled:  production without Stripe. Checkout refuses to run, it never gives goods away.
 */
export function paymentMode(env: Env = process.env): PaymentMode {
  if (env.STRIPE_SECRET_KEY) return "stripe";
  return isProduction(env) ? "disabled" : "simulated";
}

/** Public address of the site (no trailing slash). Used in emails, Stripe redirects and the sitemap. */
export function siteUrl(env: Env = process.env) {
  const raw = env.SITE_URL || env.AUTH_URL || env.NEXTAUTH_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const supportEmail = (env: Env = process.env) => env.SUPPORT_EMAIL || "support@example.com";
export const companyName = (env: Env = process.env) => env.COMPANY_NAME || "Pressroom";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Shipping and tax settings, in money units (e.g. 5.99), not cents. */
export function pricingConfig(env: Env = process.env) {
  return {
    shippingFlat: num(env.SHIPPING_FLAT, 4.99),
    freeShippingOver: num(env.FREE_SHIPPING_OVER, 75),
    // 0.0825 means 8.25%
    taxRate: num(env.TAX_RATE, 0),
    currency: (env.CURRENCY || "usd").toLowerCase(),
  };
}

/** Problems that should stop a production server from starting, and things worth a warning. */
export function envProblems(env: Env = process.env) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isProduction(env)) return { errors, warnings };

  if (!env.DATABASE_URL) errors.push("DATABASE_URL is not set.");

  const secret = env.AUTH_SECRET || env.NEXTAUTH_SECRET || "";
  if (secret.length < 32) errors.push("AUTH_SECRET must be set to a random value of at least 32 characters.");

  if (!siteUrl(env).startsWith("https://")) {
    errors.push("SITE_URL (or AUTH_URL) must be the public https:// address of the site.");
  }

  // Without this Auth.js rejects every request ("UntrustedHost") and nobody can log in.
  if (!env.AUTH_TRUST_HOST && !env.AUTH_URL && !env.NEXTAUTH_URL) {
    errors.push("Set AUTH_TRUST_HOST=true (or AUTH_URL), or login will fail with UntrustedHost.");
  }

  if (paymentMode(env) === "disabled") {
    warnings.push("STRIPE_SECRET_KEY is not set: checkout is disabled.");
  } else if (!env.STRIPE_WEBHOOK_SECRET) {
    errors.push("STRIPE_WEBHOOK_SECRET is required when Stripe is on, or paid orders will never be confirmed.");
  }

  if (!env.S3_BUCKET) {
    warnings.push("S3_BUCKET is not set: uploads are stored in the database. Fine to start; use a bucket as you grow.");
  }
  if (!env.SUPPORT_EMAIL) {
    warnings.push("SUPPORT_EMAIL is not set: the policy pages show a placeholder contact address.");
  }
  if (!env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY is not set: no emails are sent and email verification is skipped.");
  }
  if (!env.UPSTASH_REDIS_REST_URL) {
    warnings.push("UPSTASH_REDIS_REST_URL is not set: rate limits are per server instance only.");
  }
  return { errors, warnings };
}
