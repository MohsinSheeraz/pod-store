import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import HeroMockup from "@/components/home/HeroMockup";

const STEPS = [
  {
    title: "Pick a product",
    body: "Tees, hoodies, mugs, totes, and posters, each with a clearly marked print area.",
  },
  {
    title: "Add your artwork",
    body: "Upload a file or choose from the catalog, then move and resize it on the product.",
  },
  {
    title: "We print and ship",
    body: "Your order is printed after you place it and shipped straight to you.",
  },
];

export default async function HomePage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    include: { category: true },
  });

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title">Your artwork, printed on demand.</h1>
            <p className="hero-lede">
              Choose a product, add your design, and we print it when you order. No minimums, no
              stock to buy.
            </p>
            <div className="hero-actions">
              <Link href="/#products" className="btn btn-primary btn-lg">
                Browse products
              </Link>
              <Link href="/#how" className="btn btn-ghost btn-lg">
                How it works
              </Link>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      <section id="products" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Products</h2>
            <p>Start from a blank and make it yours.</p>
          </div>

          {products.length === 0 ? (
            <p className="empty">
              No products yet. Run <code>npm run db:seed</code> to add the starter catalog.
            </p>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="product-tile">
                  <div className="tile-art">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} />
                    ) : (
                      <span className="tile-placeholder">{p.name}</span>
                    )}
                  </div>
                  <div className="tile-body">
                    <h3>{p.name}</h3>
                    <p>
                      {p.category.name} · From {formatMoney(p.basePrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how" className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-number">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
