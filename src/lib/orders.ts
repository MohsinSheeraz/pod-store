import { Prisma } from "@prisma/client";
import { zoneProblem } from "@/lib/placement-rules";

export const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: { include: { product: { include: { category: true } } } },
      prints: { include: { zone: true, design: true }, orderBy: { zone: { sortOrder: "asc" } } },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
export type CartLine = CartWithItems["items"][number];

// Payment isn't built yet. While this is on, checkout simulates a successful payment and saves
// the order as PAID. Set PAYMENT_MODE=live once a real payment provider is connected.
export const TEST_PAYMENTS = process.env.PAYMENT_MODE !== "live";

export const toCents = (value: unknown) => Math.round(Number(value) * 100);
export const toMoney = (cents: number) => cents / 100;

// Server-side price of one unit: base price + size/color delta + a fee per print area.
export function unitCents(item: CartLine) {
  // A print area costs the same whether it holds a design, text or both.
  const fees = new Map(item.prints.map((p) => [p.zoneId, toCents(p.zone.fee)]));
  return (
    toCents(item.variant.product.basePrice) +
    toCents(item.variant.priceDelta) +
    [...fees.values()].reduce((sum, c) => sum + c, 0)
  );
}

export function variantLabel(item: CartLine) {
  const { color, size } = item.variant;
  return [color, size !== "One size" ? size : null].filter(Boolean).join(" · ");
}

// Why this cart line can't be ordered right now, or null when it's fine.
export function blockedReason(item: CartLine): string | null {
  const { variant } = item;
  const { product } = variant;

  if (!variant.available || !product.active) {
    return `${product.name} is no longer available. Remove it from your cart.`;
  }
  if (item.prints.length === 0) {
    return `${product.name} has nothing to print. Remove it from your cart.`;
  }
  for (const p of item.prints) {
    const missing = !p.text && !p.design;
    if (missing) {
      return `${product.name}: the ${p.zone.label} print is missing its artwork. Remove it from your cart.`;
    }
    const problem = zoneProblem(p.zone);
    if (problem) {
      return `${product.name}: ${problem} Remove it from your cart.`;
    }
  }
  return null;
}

export type Shipping = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export type ShippingResult = { ok: true; value: Shipping } | { ok: false; error: string };

const LIMITS: Record<keyof Shipping, number> = {
  name: 80,
  phone: 30,
  line1: 160,
  city: 80,
  postalCode: 20,
  country: 80,
};

const LABELS: Record<keyof Shipping, string> = {
  name: "Full name",
  phone: "Phone",
  line1: "Address",
  city: "City",
  postalCode: "Postal code",
  country: "Country",
};

const REQUIRED: (keyof Shipping)[] = ["name", "phone", "line1", "city", "country"];

export function parseShipping(raw: unknown): ShippingResult {
  const input = (raw ?? {}) as Record<string, unknown>;
  const value = {} as Shipping;

  for (const key of Object.keys(LIMITS) as (keyof Shipping)[]) {
    const v = typeof input[key] === "string" ? (input[key] as string).trim() : "";
    if (v.length > LIMITS[key]) return { ok: false, error: `${LABELS[key]} is too long.` };
    value[key] = v;
  }

  for (const key of REQUIRED) {
    if (!value[key]) return { ok: false, error: `${LABELS[key]} is required.` };
  }

  if (!/^[+()\d\s-]{7,}$/.test(value.phone)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  return { ok: true, value };
}