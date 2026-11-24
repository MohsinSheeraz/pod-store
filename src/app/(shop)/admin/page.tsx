import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/admin";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, isOrderStatus, orderRef } from "@/lib/order-views";
import StatusBadge from "@/components/orders/StatusBadge";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = isOrderStatus(status) ? status : null;

  const [orders, counts, revenue, customers] = await Promise.all([
    prisma.order.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    // What has actually been earned: paid or further along, not cancelled or unpaid.
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] } },
      _sum: { total: true },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);
  const toProduce = (byStatus.PAID ?? 0) + (byStatus.IN_PRODUCTION ?? 0);

  return (
    <div className="container cart-page">
      <h1>Admin</h1>

      <div className="stat-grid">
        <div className="stat">
          <span>Orders</span>
          <strong>{total}</strong>
        </div>
        <div className="stat">
          <span>To produce</span>
          <strong>{toProduce}</strong>
        </div>
        <div className="stat">
          <span>Revenue</span>
          <strong>{formatMoney(Number(revenue._sum.total ?? 0))}</strong>
        </div>
        <div className="stat">
          <span>Customers</span>
          <strong>{customers}</strong>
        </div>
      </div>

      <div className="filter-row" role="group" aria-label="Filter by status">
        <Link href="/admin" className="chip" aria-pressed={!filter}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className="chip" aria-pressed={filter === s}>
            {ORDER_STATUS_LABEL[s]}
            {byStatus[s] ? ` · ${byStatus[s]}` : ""}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="empty">No orders here yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th>Items</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="table-link">
                      {orderRef(o.id)}
                    </Link>
                  </td>
                  <td>
                    {o.user.name}
                    <small>{o.user.email}</small>
                  </td>
                  <td>{o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</td>
                  <td>{o.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="num">{formatMoney(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
