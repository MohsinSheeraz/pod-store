import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeroMockup from "@/components/home/HeroMockup";
import ProductTile from "@/components/home/ProductTile";

const STEPS = [
  {
    title: "Pick a product",
    body: "Tees, hoodies, mugs, totes, and posters, each with a clearly marked print area.",
  },
  {
    title: "Add your artwork",
    body: "Upload a file or choose from the catalog, add text, then move and resize it on the product.",
  },
  {
    title: "We print and ship",
    body: "See it on a model first. Your order is printed after you place it and shipped straight to you.",
  },
];

const FAQ = [
  {
    q: "How long until my order ships?",
    a: "Every item is printed to order. Production usually takes 2 to 5 business days, then it ships and you get a tracking number by email.",
  },
  {
    q: "What kind of image can I upload?",
    a: "PNG, JPG or WebP up to 10 MB. Bigger images print sharper, and the editor warns you if one is too small for the size you chose.",
  },
  {
    q: "What gets printed?",
    a: "Only what sits inside the dashed print area. Anything outside it is shown faded in the editor and is cut off.",
  },
  {
    q: "Can I cancel or change an order?",
    a: "You can cancel from your order page any time before production starts, and you are refunded in full.",
  },
  {
    q: "What if something arrives wrong?",
    a: "Read our returns policy for what we cover, then contact us and we will make it right.",
  },
];

const TRUST = [
  "Printed on demand",
  "Preview on a model before you buy",
  "Secure checkout",
  "Cancel until production",
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
            <span className="eyebrow">
              <i className="eyebrow-dot" /> See it on a real model before you order
            </span>
            <h1 className="hero-title">
              Your artwork, <span className="grad-text">printed</span> on demand.
            </h1>
            <p className="hero-lede">
              Choose a product, add your design or your words, and we print it when you order. No
              minimums, no stock to buy.
            </p>
            <div className="hero-actions">
              <Link href="/#products" className="btn btn-glow btn-lg">
                Start designing →
              </Link>
              <Link href="/#how" className="btn btn-ghost btn-lg">
                How it works
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <span className="float-chip float-chip-a">
              <b>✦</b> No minimums
            </span>
            <span className="float-chip float-chip-b">
              <b>★</b> Live model previews
            </span>
            <span className="float-chip float-chip-c">
              <b>↗</b> Ships worldwide
            </span>
            <HeroMockup />
          </div>
        </div>
      </section>

      <ul className="trust-strip" aria-label="Why shop here">
        {TRUST.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <section id="products" className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="kicker">The lineup</span>
            <h2>Pick your canvas.</h2>
            <p>Start from a blank and make it yours.</p>
          </div>

          {products.length === 0 ? (
            <p className="empty">
              No products yet. Run <code>npm run db:seed</code> to add the starter catalog.
            </p>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <div key={p.id} className="reveal">
                  <ProductTile
                    slug={p.slug}
                    name={p.name}
                    categorySlug={p.category.slug}
                    categoryName={p.category.name}
                    price={Number(p.basePrice)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="how" className="section section-alt">
        <div className="container">
          <div className="section-head reveal">
            <span className="kicker">Three steps</span>
            <h2>From idea to doorstep.</h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="how-step reveal">
                <span className="how-num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="container faq">
          <div className="section-head reveal">
            <span className="kicker">Questions</span>
            <h2>Good to know.</h2>
          </div>
          <div className="faq-list reveal">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>
                  {f.a}
                  {f.q.startsWith("What if") && (
                    <>
                      {" "}
                      <Link href="/returns">Returns policy</Link>
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
