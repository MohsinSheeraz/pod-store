import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { shippingNote } from "@/lib/shipping-note";
import ProductHero from "@/components/product/ProductHero";
import ProductTile from "@/components/home/ProductTile";
import { shapeFor } from "@/components/product/ProductSilhouette";
import type { ViewKey } from "@/components/product/types";

const getProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      variants: { orderBy: { id: "asc" } },
      zones: { orderBy: { sortOrder: "asc" } },
    },
  })
);

const VIEW_NAME: Record<string, string> = { front: "Front", back: "Back", left: "Left side", right: "Right side" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return {
    title: product?.name ?? "Product",
    description: product ? `${product.description} Design it yourself and preview it on a model.` : undefined,
    openGraph: product ? { title: product.name, description: product.description } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || product.variants.length === 0 || product.zones.length === 0) notFound();

  const others = await prisma.product.findMany({
    where: { active: true, NOT: { id: product.id } },
    orderBy: { createdAt: "asc" },
    include: { category: true },
    take: 3,
  });

  const colors = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()].map(
    ([name, hex]) => ({ name, hex })
  );
  const sizes = [...new Map(product.variants.map((v) => [v.size, Number(v.priceDelta)])).entries()];
  const views = (["front", "back", "left"] as ViewKey[]).filter((v) =>
    product.zones.some((z) => (v === "left" ? z.view === "left" || z.view === "right" : z.view === v))
  );
  const shape = shapeFor(product.slug, product.category.slug);

  return (
    <>
      <ProductHero
        slug={product.slug}
        name={product.name}
        description={product.description}
        categoryName={product.category.name}
        shape={shape}
        fromPrice={Number(product.basePrice)}
        colors={colors}
        sizes={sizes.map(([s]) => s)}
        views={views}
        areaNames={product.zones.map((z) => z.label)}
        shippingNote={shippingNote()}
      />

      <section className="section">
        <div className="container pdp-detail">
          <div>
            <span className="kicker">Where it prints</span>
            <h2>Print areas</h2>
            <p className="pdp-lede">
              Each area takes one design and one line of text. Some areas are included in the price; the rest add a
              flat fee, charged once however many things you put in it.
            </p>
          </div>
          <table className="pdp-table">
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">View</th>
                <th scope="col">Size</th>
                <th scope="col">Fee</th>
              </tr>
            </thead>
            <tbody>
              {product.zones.map((z) => (
                <tr key={z.id}>
                  <th scope="row">{z.label}</th>
                  <td>{VIEW_NAME[z.view] ?? z.view}</td>
                  <td>
                    {z.widthIn} × {z.heightIn} in
                  </td>
                  <td>{Number(z.fee) > 0 ? `+${formatMoney(Number(z.fee))}` : "Included"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sizes.length > 1 && (
        <section className="section section-alt">
          <div className="container pdp-detail">
            <div>
              <span className="kicker">Sizing</span>
              <h2>Sizes and price</h2>
            </div>
            <table className="pdp-table">
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map(([size, delta]) => (
                  <tr key={size}>
                    <th scope="row">{size}</th>
                    <td>{formatMoney(Number(product.basePrice) + delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container pdp-detail">
          <div>
            <span className="kicker">Before you order</span>
            <h2>Good to know</h2>
          </div>
          <ul className="pdp-notes">
            <li>
              <strong>Previews are a guide.</strong> Real colors and the exact print position can differ a little from
              what you see on screen.
            </li>
            <li>
              <strong>Only the dashed area prints.</strong> Anything outside it is cut off.
            </li>
            <li>
              <strong>Use a large image.</strong> PNG, JPG or WebP up to 10 MB. The editor warns you when one is too
              small for its size. Ready-made art prints sharp at any size.
            </li>
            <li>
              <strong>Changed your mind?</strong> Cancel from your order page until production starts for a full
              refund. See the <Link href="/returns">returns policy</Link> and <Link href="/shipping">shipping</Link>{" "}
              details.
            </li>
          </ul>
        </div>
      </section>

      {others.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head">
              <span className="kicker">Keep going</span>
              <h2>More to customize</h2>
            </div>
            <div className="product-grid">
              {others.map((p) => (
                <ProductTile
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  categorySlug={p.category.slug}
                  categoryName={p.category.name}
                  price={Number(p.basePrice)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
