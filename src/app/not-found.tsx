import Link from "next/link";
import Header from "@/components/layout/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="site-main">
        <div className="container status-page">
          <p className="status-code">404</p>
          <h1>We couldn&apos;t find that page.</h1>
          <p className="hint">The link may be old, or the page may have moved.</p>
          <div className="status-actions">
            <Link href="/" className="btn btn-primary">
              Back home
            </Link>
            <Link href="/#products" className="btn btn-ghost">
              Browse products
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
