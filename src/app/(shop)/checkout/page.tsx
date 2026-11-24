import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { blockedReason, cartInclude, toMoney, unitCents, variantLabel } from "@/lib/orders";
import { calcTotals } from "@/lib/pricing";
import { paymentMode, pricingConfig } from "@/lib/env";
import { emailConfigured } from "@/lib/email";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import ResendVerification from "@/components/auth/ResendVerification";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [cart, user] = await Promise.all([
    prisma.cart.findUnique({ where: { userId: session.user.id }, include: cartInclude }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true, email: true } }),
  ]);

  const items = cart?.items ?? [];
  if (items.length === 0) redirect("/cart");

  const problem = items.map(blockedReason).find(Boolean) ?? null;
  const subtotalCents = items.reduce((sum, item) => sum + unitCents(item) * item.quantity, 0);
  const totals = calcTotals(subtotalCents);
  const mode = paymentMode();
  const needsVerification = emailConfigured() && !user?.emailVerified;
  const cfg = pricingConfig();

  return (
    <div className="container cart-page">
      <h1>Checkout</h1>

      {problem ? (
        <div className="cart-empty">
          <p className="warn">{problem}</p>
          <Link href="/cart" className="btn btn-primary">
            Back to cart
          </Link>
        </div>
      ) : mode === "disabled" ? (
        <div className="cart-empty">
          <p className="warn">Checkout isn&apos;t available right now. Please try again later.</p>
          <Link href="/cart" className="btn btn-primary">
            Back to cart
          </Link>
        </div>
      ) : needsVerification ? (
        <div className="cart-empty">
          <p>
            Please confirm your email address to place an order. We sent a link to <strong>{user?.email}</strong>.
          </p>
          <ResendVerification />
        </div>
      ) : (
        <div className="cart-layout">
          <CheckoutForm defaultName={session.user.name ?? ""} />

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <ul className="checkout-items">
              {items.map((item) => (
                <li key={item.id} className="checkout-item">
                  <span>
                    {item.variant.product.name} × {item.quantity}
                    <small>{variantLabel(item)}</small>
                  </span>
                  <span>{formatMoney(toMoney(unitCents(item) * item.quantity))}</span>
                </li>
              ))}
            </ul>
            <div className="summary-line">
              <span>Subtotal</span>
              <span>{formatMoney(toMoney(totals.subtotal))}</span>
            </div>
            <div className="summary-line">
              <span>Shipping</span>
              <span>{totals.shipping === 0 ? "Free" : formatMoney(toMoney(totals.shipping))}</span>
            </div>
            {totals.tax > 0 && (
              <div className="summary-line">
                <span>Tax</span>
                <span>{formatMoney(toMoney(totals.tax))}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatMoney(toMoney(totals.total))}</strong>
            </div>
            {totals.shipping > 0 && cfg.freeShippingOver > 0 && (
              <p className="hint">Free shipping on orders over {formatMoney(cfg.freeShippingOver)}.</p>
            )}
            <p className="hint">
              {mode === "stripe"
                ? "You'll pay securely on the next page. Your card details never touch our servers."
                : "Test mode: payment is simulated and no card is charged."}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
