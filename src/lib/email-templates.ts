import { companyName } from "@/lib/env";
import { formatMoney } from "@/lib/format";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Parts = { subject: string; html: string; text: string };

// One simple, email-client-safe layout in the site's colours (navy, cloud, snow).
function layout(title: string, bodyHtml: string, button?: { label: string; url: string }) {
  const name = esc(companyName());
  return `<!doctype html>
<html><body style="margin:0;background:#f8f9fa;font-family:Arial,Helvetica,sans-serif;color:#1f2e4a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dee2e6;border-radius:14px">
      <tr><td style="padding:28px 32px 8px;font-size:20px;font-weight:700;letter-spacing:-0.02em">${name}</td></tr>
      <tr><td style="padding:8px 32px 0;font-size:22px;font-weight:700">${esc(title)}</td></tr>
      <tr><td style="padding:12px 32px 8px;font-size:15px;line-height:1.55;color:#495057">${bodyHtml}</td></tr>
      ${
        button
          ? `<tr><td style="padding:12px 32px 8px"><a href="${esc(button.url)}" style="display:inline-block;background:#1f2e4a;color:#f8f9fa;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(button.label)}</a></td></tr>`
          : ""
      }
      <tr><td style="padding:20px 32px 28px;font-size:12px;color:#6c757d">${name}. If you didn't expect this email you can ignore it.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function verifyEmail(name: string, url: string): Parts {
  return {
    subject: "Confirm your email address",
    html: layout("Confirm your email", `<p>Hi ${esc(name)}, tap the button to confirm your address. The link works for 24 hours.</p>`, {
      label: "Confirm email",
      url,
    }),
    text: `Hi ${name},\n\nConfirm your email address (link works for 24 hours):\n${url}\n`,
  };
}

export function resetPasswordEmail(name: string, url: string): Parts {
  return {
    subject: "Reset your password",
    html: layout("Reset your password", `<p>Hi ${esc(name)}, use the button below to choose a new password. The link works for 1 hour and can be used once.</p>`, {
      label: "Choose a new password",
      url,
    }),
    text: `Hi ${name},\n\nChoose a new password (link works for 1 hour):\n${url}\n\nIf you didn't ask for this, ignore this email.\n`,
  };
}

export type OrderMailInfo = {
  reference: string;
  name: string;
  lines: { label: string; quantity: number; total: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  url: string;
};

export function orderConfirmationEmail(o: OrderMailInfo): Parts {
  const rows = o.lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 0">${esc(l.label)} × ${l.quantity}</td><td align="right" style="padding:4px 0">${formatMoney(l.total)}</td></tr>`
    )
    .join("");
  const extra = (label: string, value: number) =>
    value > 0 ? `<tr><td style="padding:4px 0;color:#6c757d">${label}</td><td align="right" style="padding:4px 0;color:#6c757d">${formatMoney(value)}</td></tr>` : "";
  const body = `<p>Thanks ${esc(o.name)}, we've got your payment. We'll print your order and email you when it ships.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border-top:1px solid #dee2e6">${rows}
    ${extra("Shipping", o.shipping)}${extra("Tax", o.tax)}
    <tr><td style="padding:10px 0 0;font-weight:700;border-top:1px solid #dee2e6">Total</td><td align="right" style="padding:10px 0 0;font-weight:700;border-top:1px solid #dee2e6">${formatMoney(o.total)}</td></tr></table>`;
  const text = [
    `Thanks ${o.name}, we've got your payment for order ${o.reference}.`,
    "",
    ...o.lines.map((l) => `${l.label} x ${l.quantity}  ${formatMoney(l.total)}`),
    o.shipping > 0 ? `Shipping  ${formatMoney(o.shipping)}` : "",
    o.tax > 0 ? `Tax  ${formatMoney(o.tax)}` : "",
    `Total  ${formatMoney(o.total)}`,
    "",
    `View your order: ${o.url}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  return {
    subject: `Order ${o.reference} confirmed`,
    html: layout(`Order ${o.reference} confirmed`, body, { label: "View your order", url: o.url }),
    text,
  };
}

export function orderShippedEmail(o: { reference: string; name: string; tracking: string | null; url: string }): Parts {
  const track = o.tracking ? `<p>Tracking number: <strong>${esc(o.tracking)}</strong></p>` : "";
  return {
    subject: `Order ${o.reference} has shipped`,
    html: layout(`Order ${o.reference} has shipped`, `<p>Good news ${esc(o.name)}, your order is on its way.</p>${track}`, {
      label: "View your order",
      url: o.url,
    }),
    text: `Good news ${o.name}, order ${o.reference} has shipped.${o.tracking ? `\nTracking number: ${o.tracking}` : ""}\n\nView your order: ${o.url}\n`,
  };
}
