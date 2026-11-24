import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOrderStatus, orderRef } from "@/lib/order-views";
import { sendEmail } from "@/lib/email";
import { orderShippedEmail } from "@/lib/email-templates";
import { siteUrl } from "@/lib/env";
import { undoPayment } from "@/lib/payments";

type Ctx = { params: Promise<{ id: string }> };

// Admin: change an order's status and tracking number.
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in first." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  let body: { status?: unknown; trackingNumber?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const data: {
    status?: "PENDING" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    trackingNumber?: string | null;
    shippedAt?: Date;
    deliveredAt?: Date;
  } = {};

  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    const now = new Date();
    if (body.status === "SHIPPED" && !order.shippedAt) data.shippedAt = now;
    if (body.status === "DELIVERED") {
      data.deliveredAt = now;
      if (!order.shippedAt) data.shippedAt = now;
    }
  }

  if (body.trackingNumber !== undefined) {
    if (typeof body.trackingNumber !== "string" || body.trackingNumber.length > 80) {
      return NextResponse.json({ error: "Tracking number is too long." }, { status: 400 });
    }
    data.trackingNumber = body.trackingNumber.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  // Cancelling an order that was paid gives the money back.
  if (data.status === "CANCELLED" && order.status !== "CANCELLED") {
    try {
      await undoPayment(order);
    } catch (error) {
      console.error("Refund failed:", error);
      return NextResponse.json({ error: "The refund failed, so the order was not cancelled. Check Stripe." }, { status: 502 });
    }
  }

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: { user: { select: { name: true, email: true } } },
  });

  // Tell the shopper when their order ships (only when it newly became SHIPPED).
  if (data.status === "SHIPPED" && order.status !== "SHIPPED") {
    const mail = orderShippedEmail({
      reference: orderRef(updated.id),
      name: updated.user.name,
      tracking: updated.trackingNumber,
      url: `${siteUrl()}/orders/${updated.id}`,
    });
    sendEmail({ to: updated.user.email, ...mail }).catch((e) => console.error("Shipped email failed:", e));
  }

  return NextResponse.json({ success: true });
}
