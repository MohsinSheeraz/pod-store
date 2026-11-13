import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { blockedReason, cartInclude, toMoney, unitCents, variantLabel } from "@/lib/orders";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: cartInclude,
  });

  const items = cart?.items ?? [];
  if (items.length === 0) redirect("/cart");

  const problem = items.map(blockedReason).find(Boolean) ?? null;
  const totalCents = items.reduce((sum, item) => sum + unitCents(item) * item.quantity, 0);

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
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatMoney(toMoney(totalCents))}</strong>
            </div>
            <p className="hint">
              Payment isn&apos;t collected online yet. Your order is saved as pending.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}