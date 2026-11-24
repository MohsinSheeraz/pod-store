import { formatMoney } from "@/lib/format";
import { pricingConfig } from "@/lib/env";

/** "Shipping is $4.99, free on orders over $75.00." built from the real settings, so it matches checkout. */
export function shippingNote() {
  const cfg = pricingConfig();
  return (
    `Shipping is ${formatMoney(cfg.shippingFlat)}` +
    (cfg.freeShippingOver > 0 ? `, free on orders over ${formatMoney(cfg.freeShippingOver)}.` : ".")
  );
}
