import { pricingConfig } from "@/lib/env";

export type Totals = {
  subtotal: number; // all in cents
  shipping: number;
  tax: number;
  total: number;
};

/**
 * Order totals from the items subtotal, in cents.
 * Shipping is a flat fee, free once the subtotal reaches FREE_SHIPPING_OVER. Tax is a flat rate
 * on the goods. Both come from the environment (see src/lib/env.ts).
 */
export function calcTotals(subtotalCents: number, cfg = pricingConfig()): Totals {
  const subtotal = Math.max(0, Math.round(subtotalCents));
  const free = subtotal >= Math.round(cfg.freeShippingOver * 100);
  const shipping = subtotal === 0 || free ? 0 : Math.round(cfg.shippingFlat * 100);
  const tax = Math.round(subtotal * cfg.taxRate);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}
