import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { canCancel, orderRef } from "@/lib/order-views";
import { paymentMode } from "@/lib/env";
import { syncStripePayment } from "@/lib/payments";
import OrderItems from "@/components/orders/OrderItems";
import OrderTimeline from "@/components/orders/OrderTimeline";
import StatusBadge from "@/components/orders/StatusBadge";
import CancelOrderButton from "@/components/orders/CancelOrderButton";
import PayNowButton from "@/components/orders/PayNowButton";

export const metadata: Metadata = { title: "Your order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { placed, canceled } = await searchParams;

  // Back from the payment page: ask Stripe straight away in case the webhook is a moment late.
  if (placed !== undefined) await syncStripePayment(id);

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { prints: true } } },
  });
  if (!order) notFound();

  const ship = order.shippingAddress as Record<string, string>;
  const pending = order.status === "PENDING";
  const justPlaced = placed !== undefined && !pending && order.status !== "CANCELLED";
  const simulated = paymentMode() === "simulated" && order.paymentRef === "simulated";

  return (
    <div className="container cart-page">
      <div className="order-done">
        {justPlaced ? (
          <>
            <span className="order-tick" aria-hidden="true">
              ✓
            </span>
            <h1>Order placed. Thank you!</h1>
          </>
        ) : (
          <h1>Order {orderRef(order.id)}</h1>
        )}
        <p className="hint">
          {justPlaced && <>Order {orderRef(order.id)} · </>}
          Placed {order.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
          {simulated && " · test payment, no card was charged"}
        </p>
        <StatusBadge status={order.status} />
        {pending && (
          <p className="warn">
            {canceled !== undefined
              ? "Payment was cancelled. Your order is saved; complete the payment whenever you're ready."
              : placed !== undefined
                ? "We haven't received your payment yet. This page updates once it arrives."
                : "This order is waiting for payment."}
          </p>
        )}
      </div>

      <OrderTimeline status={order.status} />

      <div className="cart-layout">
        <section className="cart-summary">
          <h2>Items</h2>
          <OrderItems items={order.items} />
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{formatMoney(Number(order.subtotal))}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>{Number(order.shipping) === 0 ? "Free" : formatMoney(Number(order.shipping))}</span>
          </div>
          {Number(order.tax) > 0 && (
            <div className="summary-line">
              <span>Tax</span>
              <span>{formatMoney(Number(order.tax))}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatMoney(Number(order.total))}</strong>
          </div>
        </section>

        <aside className="cart-summary">
          <h2>Shipping to</h2>
          <p>
            {ship.name}
            <br />
            {ship.line1}
            <br />
            {[ship.city, ship.postalCode].filter(Boolean).join(" ")}
            <br />
            {ship.country}
          </p>
          {order.trackingNumber && (
            <p className="tracking">
              <small>Tracking number</small>
              <strong>{order.trackingNumber}</strong>
            </p>
          )}
          {pending && <PayNowButton orderId={order.id} />}
          <Link href="/orders" className="btn btn-ghost btn-block">
            All my orders
          </Link>
          {canCancel(order.status) && <CancelOrderButton orderId={order.id} />}
          <Link href="/#products" className="btn btn-primary btn-block">
            Keep shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
