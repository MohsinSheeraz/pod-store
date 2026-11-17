import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { TEST_PAYMENTS } from "@/lib/orders";
import { asFont, asPlacement, asTextStyle } from "@/lib/cart";
import PrintPreview from "@/components/product/PrintPreview";
import MockupDownload from "@/components/product/MockupDownload";
import type { Shape } from "@/components/product/ProductSilhouette";
import type { ViewKey } from "@/components/product/types";
import type { ExportView } from "@/lib/mockup-export";

export const metadata: Metadata = { title: "Order confirmed" };

const VIEWS: ViewKey[] = ["front", "back", "left", "right"];

const STATUS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  IN_PRODUCTION: "In production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { prints: true } } },
  });
  if (!order) notFound();

  const ship = order.shippingAddress as Record<string, string>;

  return (
    <div className="container cart-page">
      <div className="order-done">
        <span className="order-tick" aria-hidden="true">
          ✓
        </span>
        <h1>Order placed. Thank you!</h1>
        <p className="hint">
          Order <strong>#{order.id.slice(-8).toUpperCase()}</strong> · {STATUS[order.status] ?? order.status}
          {TEST_PAYMENTS && " · test payment, no card was charged"}
        </p>
      </div>

      <div className="cart-layout">
        <section className="cart-summary">
          <h2>Items</h2>
          <ul className="order-items">
            {order.items.map((item) => {
              const views: ExportView[] = VIEWS.map((view) => ({
                view,
                zones: item.prints
                  .filter((p) => p.view === view && (p.text || p.designImageUrl))
                  .map((p) => ({
                    x: p.zoneX,
                    y: p.zoneY,
                    w: p.zoneW,
                    h: p.zoneH,
                    layer: p.text
                      ? {
                          kind: "text" as const,
                          text: p.text,
                          font: asFont(p.font),
                          color: p.color ?? "#14161B",
                          style: asTextStyle(p.placement),
                          placement: asPlacement(p.placement),
                        }
                      : {
                          kind: "image" as const,
                          imageUrl: p.designImageUrl as string,
                          placement: asPlacement(p.placement),
                        },
                  })),
              })).filter((v) => v.zones.length > 0);
              const files = item.prints.filter((p) => p.designImageUrl);

              return (
                <li key={item.id} className="order-item">
                  <div className="cart-previews">
                    {views.map((v) => (
                      <PrintPreview
                        key={v.view}
                        shape={item.shape as Shape}
                        view={v.view}
                        fill={item.colorHex}
                        zones={v.zones.map((z, i) => ({ id: `${v.view}-${i}`, ...z }))}
                      />
                    ))}
                  </div>
                  <div className="order-item-info">
                    <p>
                      <strong>
                        {item.productName} × {item.quantity}
                      </strong>
                      <small>
                        {item.variantLabel}
                        {item.prints.length > 0 && ` · ${item.prints.map((p) => p.zoneLabel).join(", ")}`}
                      </small>
                    </p>
                    <p className="order-item-price">{formatMoney(Number(item.unitPrice) * item.quantity)}</p>
                    <div className="order-downloads">
                      {views.length > 0 && (
                        <MockupDownload
                          shape={item.shape as Shape}
                          fill={item.colorHex}
                          baseName={`${item.productName} ${item.variantLabel}`}
                          views={views}
                        />
                      )}
                      {files.map((p, i) => (
                        <a
                          key={i}
                          className="btn btn-ghost btn-sm"
                          href={p.designImageUrl as string}
                          download
                        >
                          Artwork · {p.zoneLabel}
                        </a>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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
          <Link href="/#products" className="btn btn-primary btn-block">
            Keep shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
