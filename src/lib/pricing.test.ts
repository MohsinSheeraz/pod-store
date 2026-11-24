import { test } from "node:test";
import assert from "node:assert/strict";
import { calcTotals } from "@/lib/pricing";

const cfg = { shippingFlat: 4.99, freeShippingOver: 75, taxRate: 0, currency: "usd" };

test("shipping is a flat fee below the free-shipping line", () => {
  assert.deepEqual(calcTotals(2200, cfg), { subtotal: 2200, shipping: 499, tax: 0, total: 2699 });
});

test("shipping is free at and above the line", () => {
  assert.equal(calcTotals(7500, cfg).shipping, 0);
  assert.equal(calcTotals(7499, cfg).shipping, 499);
  assert.equal(calcTotals(20000, cfg).total, 20000);
});

test("tax is a flat rate on the goods and rounds to the cent", () => {
  const t = calcTotals(2200, { ...cfg, taxRate: 0.0825 });
  assert.equal(t.tax, 182); // 2200 * 0.0825 = 181.5
  assert.equal(t.total, 2200 + 499 + 182);
});

test("an empty cart costs nothing, and bad input is clamped", () => {
  assert.deepEqual(calcTotals(0, cfg), { subtotal: 0, shipping: 0, tax: 0, total: 0 });
  assert.equal(calcTotals(-500, cfg).total, 0);
  assert.equal(calcTotals(1234.6, cfg).subtotal, 1235);
});

test("free shipping can be switched off by a huge threshold, or on for everything with 0", () => {
  assert.equal(calcTotals(100, { ...cfg, freeShippingOver: 0 }).shipping, 0);
  assert.equal(calcTotals(100000, { ...cfg, freeShippingOver: 1e9 }).shipping, 499);
});
