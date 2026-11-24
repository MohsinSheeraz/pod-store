import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canCancel } from "@/lib/order-views";
import { undoPayment } from "@/lib/payments";

type Ctx = { params: Promise<{ id: string }> };

// A shopper can cancel their own order until it goes into production.
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in to manage your orders." }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: session.user.id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (!canCancel(order.status)) {
    return NextResponse.json(
      { error: "This order is already in production or finished and can't be cancelled." },
      { status: 409 }
    );
  }

  // Refund first: if that fails the order stays as it was and nobody is left out of pocket.
  try {
    await undoPayment(order);
  } catch (error) {
    console.error("Refund failed:", error);
    return NextResponse.json(
      { error: "We couldn't process the refund. Please contact support and we'll sort it out." },
      { status: 502 }
    );
  }

  // Only flip it while it is still cancellable, in case an admin moved it a moment ago.
  const { count } = await prisma.order.updateMany({
    where: { id, userId: session.user.id, status: { in: ["PENDING", "PAID"] } },
    data: { status: "CANCELLED" },
  });
  if (count === 0) {
    return NextResponse.json({ error: "This order can't be cancelled any more." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
