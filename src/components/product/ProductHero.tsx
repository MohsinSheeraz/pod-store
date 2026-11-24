"use client";

import Link from "next/link";
import { useState } from "react";
import ProductSilhouette, { ProductShade, type Shape } from "@/components/product/ProductSilhouette";
import { LOOKS } from "@/components/product/sample-looks";
import { formatMoney } from "@/lib/format";
import type { ViewKey } from "@/components/product/types";

const VIEW_LABEL: Record<string, string> = { front: "Front", back: "Back", left: "Side" };

type Props = {
  slug: string;
  name: string;
  description: string;
  categoryName: string;
  shape: Shape;
  fromPrice: number;
  colors: { name: string; hex: string }[];
  sizes: string[];
  views: ViewKey[];
  areaNames: string[];
  shippingNote: string;
};

// The top of a product page: a gallery that follows the chosen colour, and the buy box.
export default function ProductHero({
  slug,
  name,
  description,
  categoryName,
  shape,
  fromPrice,
  colors,
  sizes,
  views,
  areaNames,
  shippingNote,
}: Props) {
  const [color, setColor] = useState(colors[0]);
  const [view, setView] = useState<ViewKey>("front");
  const look = LOOKS[shape];
  const oneSize = sizes.length <= 1;

  return (
    <section className="pdp container">
      <div className="pdp-gallery">
        <div className="pdp-stage">
          <div className="pdp-stage-inner">
            <ProductSilhouette shape={shape} view={view} fill={color.hex} />
            {view === "front" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="tile-design"
                src={look.design}
                alt=""
                style={{ left: `${look.x}%`, top: `${look.y}%`, width: `${look.w}%` }}
              />
            )}
            <ProductShade shape={shape} view={view} />
          </div>
          <span className="pdp-caption">Example artwork. Yours goes here.</span>
        </div>

        {views.length > 1 && (
          <div className="pdp-thumbs" role="group" aria-label="Views">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                className="pdp-thumb"
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                <span className="pdp-thumb-art">
                  <ProductSilhouette shape={shape} view={v} fill={color.hex} />
                </span>
                {VIEW_LABEL[v] ?? v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-info">
        <nav className="pdp-crumbs" aria-label="Breadcrumb">
          <Link href="/#products">Products</Link>
          <span aria-hidden="true">/</span>
          <span>{categoryName}</span>
        </nav>
        <h1>{name}</h1>
        <p className="pdp-price">
          From {formatMoney(fromPrice)} <small>before print-area fees</small>
        </p>
        <p className="pdp-desc">{description}</p>

        {colors.length > 1 && (
          <div className="pdp-field">
            <span className="pdp-label">
              Color <strong>{color.name}</strong>
            </span>
            <div className="swatches">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="swatch"
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name}
                  aria-pressed={c.name === color.name}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pdp-field">
          <span className="pdp-label">{oneSize ? "Size" : "Sizes"}</span>
          <div className="pdp-chips">
            {sizes.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>

        <Link
          href={`/products/${slug}/design?color=${encodeURIComponent(color.name)}`}
          className="btn btn-primary pdp-cta"
        >
          Start designing
        </Link>
        <p className="pdp-sub">Designing is free. You only pay when you place the order.</p>

        <dl className="pdp-facts">
          <div>
            <dt>Print areas</dt>
            <dd>{areaNames.join(", ")}</dd>
          </div>
          <div>
            <dt>Made</dt>
            <dd>Printed to order, 2 to 5 business days</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{shippingNote}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
