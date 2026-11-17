import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HeaderClient from "@/components/layout/HeaderClient";

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
    <HeaderClient
      user={session?.user ? { name: session.user.name ?? "", role: session.user.role } : null}
      cartCount={cartCount}
    />
  );
}
