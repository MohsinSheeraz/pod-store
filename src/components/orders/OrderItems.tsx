import { formatMoney } from "@/lib/format";
import { orderItemViews, type OrderItemWithPrints } from "@/lib/order-views";
import PrintPreview from "@/components/product/PrintPreview";
import MockupDownload from "@/components/product/MockupDownload";
import type { Shape } from "@/components/product/ProductSilhouette";

// The items of an order with mockup previews and downloads. Used on the shopper's order page and
// on the admin order page, where the artwork links double as the production files.
export default function OrderItems({ items }: { items: OrderItemWithPrints[] }) {
  return (
    <ul className="order-items">
      {items.map((item) => {
        const views = orderItemViews(item);
        const files = item.prints.filter((p) => p.designImageUrl);
        const texts = item.prints.filter((p) => p.text);

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
                  {item.prints.length > 0 &&
                    ` · ${[...new Set(item.prints.map((p) => p.zoneLabel))].join(", ")}`}
                </small>
              </p>
              {texts.length > 0 && (
                <ul className="order-texts">
                  {texts.map((p) => (
                    <li key={p.id}>
                      “{p.text}” <small>on {p.zoneLabel}</small>
                    </li>
                  ))}
                </ul>
              )}
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
                {files.map((p) => (
                  <a key={p.id} className="btn btn-ghost btn-sm" href={p.designImageUrl as string} download>
                    Artwork · {p.zoneLabel}
                  </a>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
