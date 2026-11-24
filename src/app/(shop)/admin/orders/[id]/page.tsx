import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/admin";
import { orderRef } from "@/lib/order-views";
import OrderItems from "@/components/orders/OrderItems";
import StatusBadge from "@/components/orders/StatusBadge";
import AdminOrderForm from "@/components/orders/AdminOrderForm";

export const metadata: Metadata = { title: "Admin order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { prints: true } },
    },
  });
  if (!order) notFound();

  const ship = order.shippingAddress as Record<string, string>;

  return (
    <div className="container cart-page">
      <Link href="/admin" className="back-link">
        ← All orders
      </Link>
      <div className="admin-head">
        <h1>Order {orderRef(order.id)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="hint">
        {order.user.name} · {order.user.email} · placed{" "}
        {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        {order.shippedAt && ` · shipped ${order.shippedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`}
        {order.deliveredAt &&
          ` · delivered ${order.deliveredAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`}
      </p>

      <div className="cart-layout">
        <section className="cart-summary">
          <h2>Items to produce</h2>
          <p className="hint">The artwork buttons download the original files for printing.</p>
          <OrderItems items={order.items} />
          <div className="summary-row">
            <span>Total</span>
            <strong>{formatMoney(Number(order.total))}</strong>
          </div>
        </section>

        <aside className="cart-summary">
          <h2>Fulfilment</h2>
          <AdminOrderForm
            orderId={order.id}
            status={order.status}
            trackingNumber={order.trackingNumber ?? ""}
          />
          <h2>Ship to</h2>
          <p>
            {ship.name}
            <br />
            {ship.line1}
            <br />
            {[ship.city, ship.postalCode].filter(Boolean).join(" ")}
            <br />
            {ship.country}
            <br />
            <small>{ship.phone}</small>
          </p>
        </aside>
      </div>
    </div>
  );
}
