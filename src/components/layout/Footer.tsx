import Link from "next/link";
import { SITE } from "@/lib/site";
import Logo from "@/components/layout/Logo";
import ThemeToggle from "@/components/layout/ThemeToggle";

const TICKER = [
  "Print on demand",
  "No minimums",
  "Tees · Hoodies · Mugs · Totes · Posters",
  "Printed only when you order",
  "Your art, your rules",
  "Ships worldwide",
];

const SHOP = [
  { href: "/products/classic-tee", label: "Classic Tee" },
  { href: "/products/pullover-hoodie", label: "Pullover Hoodie" },
  { href: "/products/ceramic-mug", label: "Ceramic Mug" },
  { href: "/products/canvas-tote", label: "Canvas Tote" },
  { href: "/products/art-poster", label: "Art Poster" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* The ticker is drawn twice so it can loop without a gap. */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((n) => (
            <div className="ticker-set" key={n}>
              {TICKER.map((t) => (
                <span key={t}>
                  {t}
                  <i className="ticker-star" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="container footer-main">
        <div className="footer-cta reveal">
          <h2>
            Make something <em>worth wearing.</em>
          </h2>
          <p>Pick a product, drop in your art, and see it on a real garment before you order.</p>
          <Link href="/#products" className="btn btn-glow btn-lg">
            Start designing →
          </Link>
        </div>

        <div className="footer-grid">
          <div className="footer-brand reveal">
            <Link href="/" aria-label="Home">
              <Logo />
            </Link>
            <p>{SITE.description}</p>
            <ThemeToggle className="footer-theme" />
          </div>

          <nav className="footer-col reveal" aria-label="Shop">
            <h3>Shop</h3>
            <ul>
              {SHOP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="foot-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer-col reveal" aria-label="Studio">
            <h3>Studio</h3>
            <ul>
              <li>
                <Link href="/#how" className="foot-link">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/cart" className="foot-link">
                  Your cart
                </Link>
              </li>
              <li>
                <Link href="/orders" className="foot-link">
                  My orders
                </Link>
              </li>
              <li>
                <Link href="/login" className="foot-link">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="foot-link">
                  Create account
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="footer-word" aria-hidden="true">
          {SITE.name}
        </div>

        <div className="footer-bottom">
          <p>
            © {year} {SITE.name}. Every order is printed after you place it. Nothing sits in a warehouse.
          </p>
          <nav className="legal-links" aria-label="Policies">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns</Link>
          </nav>
          <a href="#" className="to-top">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
