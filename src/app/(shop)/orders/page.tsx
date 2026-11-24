import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { orderRef } from "@/lib/order-views";
import StatusBadge from "@/components/orders/StatusBadge";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { productName: true, quantity: true } } },
  });

  return (
    <div className="container cart-page">
      <h1>My orders</h1>

      {orders.length === 0 ? (
        <div className="cart-empty">
          <p>You haven&apos;t placed an order yet.</p>
          <Link href="/#products" className="btn btn-primary">
            Start designing
          </Link>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((o) => {
            const count = o.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="order-row">
                  <div className="order-row-main">
                    <strong>{orderRef(o.id)}</strong>
                    <small>
                      {o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {count}{" "}
                      {count === 1 ? "item" : "items"}
                    </small>
                    <span className="order-row-items">
                      {o.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                    </span>
                  </div>
                  <StatusBadge status={o.status} />
                  <span className="order-row-total">{formatMoney(Number(o.total))}</span>
                  <span className="order-row-go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
