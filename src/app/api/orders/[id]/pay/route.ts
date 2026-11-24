import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paymentMode } from "@/lib/env";
import { markPaid, startStripePayment, syncStripePayment } from "@/lib/payments";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

// Pay for an order that is still waiting for payment (for example after closing the Stripe page).
export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in to pay for an order." }, { status: 401 });
  }

  const mode = paymentMode();
  if (mode === "disabled") {
    return NextResponse.json({ error: "Payments are not available right now." }, { status: 503 });
  }

  const limit = await rateLimit(`pay:${session.user.id}`, { limit: 20, windowSec: 3600 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: session.user.id } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "This order is not waiting for payment." }, { status: 409 });
  }

  if (mode === "simulated") {
    await markPaid(order.id, "simulated");
    return NextResponse.json({ id: order.id });
  }

  // They may have paid a moment ago and the webhook is still on its way.
  if (await syncStripePayment(order.id)) return NextResponse.json({ id: order.id });

  try {
    const url = await startStripePayment(order.id);
    return NextResponse.json({ id: order.id, url });
  } catch (error) {
    console.error("Could not start payment:", error);
    return NextResponse.json({ error: "Could not reach the payment page. Try again." }, { status: 502 });
  }
}
