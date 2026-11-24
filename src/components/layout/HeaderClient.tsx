"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/layout/Logo";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/layout/SignOutButton";

type Props = {
  user: { name: string; role: string } | null;
  cartCount: number;
};

const NAV = [
  { href: "/#products", label: "Products" },
  { href: "/#how", label: "How it works" },
];

export default function HeaderClient({ user, cartCount }: Props) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  // The menu is "open for" the page it was opened on, so it closes itself when you navigate.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  // Frosted bar once the page scrolls, plus a thin progress line. Written straight to the DOM:
  // nothing re-renders while scrolling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.dataset.scrolled = window.scrollY > 6 ? "1" : "0";
      el.style.setProperty("--progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="site-header" ref={ref} data-scrolled="0">
      <div className="site-header-inner">
        <Link href="/" className="logo-link" aria-label="Home">
          <Logo />
        </Link>

        <nav className="site-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="nav-link">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />

          <Link href="/cart" className="icon-btn cart-btn" aria-label={`Cart, ${cartCount} items`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 8h14l-1.1 11.2a1.5 1.5 0 0 1-1.5 1.3H7.6a1.5 1.5 0 0 1-1.5-1.3L5 8Z M9 8V6.5a3 3 0 0 1 6 0V8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            {cartCount > 0 && (
              <span key={cartCount} className="cart-badge">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="user-chip">
              <Link href="/orders" className="nav-link">
                Orders
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="nav-link">
                  Admin
                </Link>
              )}
              <span className="avatar" title={user.name}>
                {initial}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <div className="auth-links">
              <Link href="/login" className="nav-link">
                Log in
              </Link>
              <Link href="/#products" className="btn btn-glow btn-sm">
                Start designing
              </Link>
            </div>
          )}

          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-sheet"
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            <span className="burger" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="header-progress" aria-hidden="true" />

      <div id="mobile-sheet" className="mobile-sheet" data-open={open}>
        <nav aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/cart">Cart{cartCount > 0 ? ` (${cartCount})` : ""}</Link>
          {user ? (
            <>
              <Link href="/orders">My orders</Link>
              {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
