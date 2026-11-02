import Link from "next/link";
import { auth } from "@/auth";
import { SITE } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/components/layout/SignOutButton";

export default async function Header() {
  const session = await auth();

  const cartCount = session?.user
    ? ((
        await prisma.cartItem.aggregate({
          where: { cart: { userId: session.user.id } },
          _sum: { quantity: true },
        })
      )._sum.quantity ?? 0)
    : 0;

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand">
          {SITE.name}
        </Link>

        <nav className="site-nav" aria-label="Main">
          <Link href="/#products">Products</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/cart" className="nav-cart">
            Cart
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {session?.user ? (
            <>
              {session.user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <span className="nav-user">{session.user.name}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
