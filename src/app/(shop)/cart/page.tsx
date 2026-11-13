import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { asFont, asPlacement } from "@/lib/cart";
import { shapeFor } from "@/components/product/ProductSilhouette";
import PrintPreview, { type PreviewZone } from "@/components/product/PrintPreview";
import CartItemControls from "@/components/cart/CartItemControls";
import type { ViewKey } from "@/components/product/types";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: { include: { product: { include: { category: true } } } },
          prints: { include: { zone: true, design: true }, orderBy: { zone: { sortOrder: "asc" } } },
        },
      },
    },
  });

  const rows = (cart?.items ?? []).map((item) => {
    const { variant } = item;
    const { product } = variant;
    const purchasable = variant.available && product.active;

    const unitPrice =
      Number(product.basePrice) +
      Number(variant.priceDelta) +
      item.prints.reduce((sum, p) => sum + Number(p.zone.fee), 0);

    const previews = (["front", "back"] as ViewKey[])
      .map((view) => {
        const zones: PreviewZone[] = [];
        for (const p of item.prints) {
          if (p.zone.view !== view) continue;
          const placement = asPlacement(p.placement);
          const base = { id: p.id, x: p.zone.x, y: p.zone.y, w: p.zone.w, h: p.zone.h };
          if (p.zone.kind === "TEXT" && p.text) {
            zones.push({
              ...base,
              layer: {
                kind: "text",
                text: p.text,
                font: asFont(p.font),
                color: p.color ?? "#14161B",
                placement,
              },
            });
          } else if (p.design) {
            zones.push({
              ...base,
              layer: { kind: "image", imageUrl: p.design.imageUrl, placement },
            });
          }
        }
        return { view, zones };
      })
      .filter((v) => v.zones.length > 0);

    return {
      id: item.id,
      quantity: item.quantity,
      purchasable,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      productName: product.name,
      slug: product.slug,
      shape: shapeFor(product.slug, product.category.slug),
      colorHex: variant.colorHex,
      variantLabel: [variant.color, variant.size !== "One size" ? variant.size : null]
        .filter(Boolean)
        .join(" · "),
      prints: item.prints.map((p) => ({
        id: p.id,
        label: p.zone.label,
        detail: p.zone.kind === "TEXT" ? `“${p.text ?? ""}”` : (p.design?.name ?? "Artwork removed"),
        fee: Number(p.zone.fee),
      })),
      previews,
    };
  });

  const subtotal = rows.filter((r) => r.purchasable).reduce((sum, r) => sum + r.lineTotal, 0);
  const itemCount = rows.filter((r) => r.purchasable).reduce((sum, r) => sum + r.quantity, 0);
  const hasBlocked = rows.some((r) => !r.purchasable);

  return (
    <div className="container cart-page">
      <h1>Your cart</h1>

      {rows.length === 0 ? (
        <div className="cart-empty">
          <p>Your cart is empty.</p>
          <Link href="/#products" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <ul className="cart-list">
            {rows.map((r) => (
              <li key={r.id} className="cart-item">
                <div className="cart-previews">
                  {r.previews.map((v) => (
                    <PrintPreview
                      key={v.view}
                      shape={r.shape}
                      view={v.view}
                      fill={r.colorHex}
                      zones={v.zones}
                    />
                  ))}
                </div>

                <div className="cart-info">
                  <div className="cart-head">
                    <div>
                      <h2 className="cart-name">
                        <Link href={`/products/${r.slug}`}>{r.productName}</Link>
                      </h2>
                      <p className="cart-variant">{r.variantLabel}</p>
                    </div>
                    <p className="cart-line-total">{formatMoney(r.lineTotal)}</p>
                  </div>

                  <ul className="cart-prints">
                    {r.prints.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.label}: {p.detail}
                        </span>
                        <span>{p.fee > 0 ? `+${formatMoney(p.fee)}` : "Included"}</span>
                      </li>
                    ))}
                  </ul>

                  {!r.purchasable && (
                    <p className="warn">This option is no longer available. Remove it to continue.</p>
                  )}

                  <div className="cart-foot">
                    <CartItemControls id={r.id} quantity={r.quantity} />
                    <p className="cart-unit">{formatMoney(r.unitPrice)} each</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="cart-summary">
            <h2>Summary</h2>
            <div className="summary-line">
              <span>
                Items ({itemCount})
              </span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            {hasBlocked ? (
              <p className="warn">Remove the unavailable items to check out.</p>
            ) : (
              <Link href="/checkout" className="btn btn-primary btn-block">
                Checkout
              </Link>
            )}
            <Link href="/#products" className="btn btn-ghost btn-block">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}