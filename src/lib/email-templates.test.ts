import { test } from "node:test";
import assert from "node:assert/strict";
import { orderConfirmationEmail, orderShippedEmail, resetPasswordEmail, verifyEmail } from "@/lib/email-templates";

test("verification and reset emails carry the link in both html and text", () => {
  const url = "https://shop.test/verify-email?token=abc";
  const v = verifyEmail("Sam", url);
  assert.ok(v.html.includes(url) && v.text.includes(url));
  const r = resetPasswordEmail("Sam", "https://shop.test/reset-password?token=xyz");
  assert.ok(r.html.includes("token=xyz") && r.text.includes("token=xyz"));
  assert.match(r.subject, /password/i);
});

test("names are escaped so they can't inject markup into an email", () => {
  const mail = verifyEmail('<script>alert(1)</script> "Bob"', "https://x.test");
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
});

test("order confirmation lists the items and the totals", () => {
  const mail = orderConfirmationEmail({
    reference: "#ABC12345",
    name: "Sam",
    lines: [{ label: "Classic Tee (Chalk · S)", quantity: 2, total: 44 }],
    subtotal: 44,
    shipping: 4.99,
    tax: 0,
    total: 48.99,
    url: "https://shop.test/orders/1",
  });
  assert.match(mail.subject, /#ABC12345/);
  assert.ok(mail.html.includes("Classic Tee"));
  assert.ok(mail.text.includes("$48.99"));
  assert.ok(mail.text.includes("Shipping"));
  assert.ok(!mail.text.includes("Tax")); // zero tax is left out
  assert.ok(mail.text.includes("https://shop.test/orders/1"));
});

test("the shipped email shows the tracking number only when there is one", () => {
  const withTrack = orderShippedEmail({ reference: "#A", name: "Sam", tracking: "1Z999", url: "https://x.test" });
  assert.ok(withTrack.text.includes("1Z999") && withTrack.html.includes("1Z999"));
  const without = orderShippedEmail({ reference: "#A", name: "Sam", tracking: null, url: "https://x.test" });
  assert.ok(!without.text.includes("Tracking"));
});
