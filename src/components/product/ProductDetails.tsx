import { formatMoney } from "@/lib/format";
import type { ProductDTO } from "@/components/product/types";

const VIEW_LABEL: Record<string, string> = {
  front: "Front",
  back: "Back",
  left: "Left side",
  right: "Right side",
};

// Everything a shopper wants to know before ordering, folded away so the editor stays calm.
// Only facts the app itself knows: the product's own text, its print areas and prices, and how
// previews and production work.
export default function ProductDetails({
  product,
  shippingNote,
}: {
  product: ProductDTO;
  shippingNote: string;
}) {
  const sizes = [...new Map(product.variants.map((v) => [v.size, v.priceDelta])).entries()];
  const colors = [...new Set(product.variants.map((v) => v.color))];

  return (
    <section className="details" aria-label="Product details">
      <h2 className="details-title">Product details</h2>

      <details open>
        <summary>About this product</summary>
        <p>{product.description}</p>
      </details>

      <details>
        <summary>Print areas</summary>
        <ul className="details-list">
          {product.zones.map((z) => (
            <li key={z.key}>
              <span>
                <strong>{z.label}</strong>
                <small>
                  {VIEW_LABEL[z.view] ?? z.view} · {z.widthIn} × {z.heightIn} in
                </small>
              </span>
              <span>{z.fee > 0 ? `+${formatMoney(z.fee)}` : "Included"}</span>
            </li>
          ))}
        </ul>
        <p className="details-note">
          Each area takes a design and a line of text. The front and the left-chest monogram are either-or.
        </p>
      </details>

      <details>
        <summary>Sizes and colors</summary>
        <p>
          {sizes.length > 1 || sizes[0]?.[0] !== "One size" ? (
            <>
              Sizes:{" "}
              {sizes
                .map(([size, delta]) => (delta > 0 ? `${size} (+${formatMoney(delta)})` : size))
                .join(", ")}
              .
            </>
          ) : (
            "One size."
          )}
        </p>
        <p>
          {colors.length} {colors.length === 1 ? "color" : "colors"}: {colors.join(", ")}.
        </p>
      </details>

      <details>
        <summary>Making and shipping</summary>
        <ul className="details-bullets">
          <li>Printed to order after payment, usually in 2 to 5 business days.</li>
          <li>{shippingNote}</li>
          <li>You get a tracking number by email when it ships.</li>
          <li>Cancel from your order page until production starts, and you are refunded in full.</li>
        </ul>
      </details>

      <details>
        <summary>Good to know</summary>
        <ul className="details-bullets">
          <li>Mockups are a guide. Real colors and the exact print position can differ a little.</li>
          <li>Only what sits inside the dashed print area is printed. Anything outside is shown faded and is cut off.</li>
          <li>Sharp results need a large image: you&apos;ll see a warning if one is too small for its size.</li>
          <li>Vector art (like the ready-made designs) prints crisp at any size.</li>
        </ul>
      </details>
    </section>
  );
}
