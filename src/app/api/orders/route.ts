import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { shapeFor } from "@/components/product/ProductSilhouette";
import {
  blockedReason,
  cartInclude,
  parseShipping,
  toMoney,
  unitCents,
  variantLabel,
} from "@/lib/orders";
import { calcTotals } from "@/lib/pricing";
import { paymentMode } from "@/lib/env";
import { emailConfigured } from "@/lib/email";
import { markPaid, startStripePayment } from "@/lib/payments";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

class CheckoutError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Log in to place an order." }, { status: 401 });
  }

  const mode = paymentMode();
  if (mode === "disabled") {
    return NextResponse.json(
      { error: "Checkout is not available right now. Please try again later." },
      { status: 503 }
    );
  }

  const limit = await rateLimit(`checkout:${session.user.id}`, { limit: 10, windowSec: 3600 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { shipping?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const shipping = parseShipping(body.shipping);
  if (!shipping.ok) {
    return NextResponse.json({ error: shipping.error }, { status: 400 });
  }

  const userId = session.user.id;

  // With email set up, an order needs a confirmed address (for the receipt and tracking emails).
  if (emailConfigured()) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
    if (!user?.emailVerified) {
      return NextResponse.json(
        { error: "Please confirm your email address before ordering. We sent you a link." },
        { status: 403 }
      );
    }
  }

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        // Read the cart inside the transaction so what we charge is what we save.
        const cart = await tx.cart.findUnique({ where: { userId }, include: cartInclude });
        const items = cart?.items ?? [];

        if (!cart || items.length === 0) {
          throw new CheckoutError("Your cart is empty.", 400);
        }

        for (const item of items) {
          const reason = blockedReason(item);
          if (reason) throw new CheckoutError(reason, 409);
        }

        let subtotalCents = 0;

        const lines: Prisma.OrderItemCreateWithoutOrderInput[] = items.map((item) => {
          const { variant } = item;
          const { product } = variant;
          const unit = unitCents(item);
          subtotalCents += unit * item.quantity;

          return {
            variant: { connect: { id: variant.id } },
            productName: product.name,
            variantLabel: variantLabel(item),
            shape: shapeFor(product.slug, product.category.slug),
            colorHex: variant.colorHex,
            quantity: item.quantity,
            unitPrice: toMoney(unit),
            prints: {
              create: item.prints.map((p, i) => ({
                zoneLabel: p.zone.label,
                kind: p.text ? "TEXT" : "IMAGE",
                view: p.zone.view,
                zoneX: p.zone.x,
                zoneY: p.zone.y,
                zoneW: p.zone.w,
                zoneH: p.zone.h,
                design: p.designId ? { connect: { id: p.designId } } : undefined,
                designImageUrl: p.design?.imageUrl ?? null,
                text: p.text,
                font: p.font,
                color: p.color,
                placement: p.placement as Prisma.InputJsonValue,
                // A print area is charged once, even when it holds a design and text.
                fee: item.prints.findIndex((q) => q.zoneId === p.zoneId) === i ? p.zone.fee : 0,
              })),
            },
          };
        });

        const totals = calcTotals(subtotalCents);

        // Always saved as PENDING. It becomes PAID only when payment is confirmed (instantly in
        // development, by Stripe's webhook in production).
        const created = await tx.order.create({
          data: {
            user: { connect: { id: userId } },
            status: "PENDING",
            subtotal: toMoney(totals.subtotal),
            shipping: toMoney(totals.shipping),
            tax: toMoney(totals.tax),
            total: toMoney(totals.total),
            shippingAddress: shipping.value,
            items: { create: lines },
          },
        });

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    if (mode === "simulated") {
      await markPaid(order.id, "simulated");
      return NextResponse.json({ id: order.id }, { status: 201 });
    }

    // Stripe: send the shopper to the hosted payment page. If that fails the order stays pending
    // and can be paid from its page ("Complete payment").
    try {
      const url = await startStripePayment(order.id);
      return NextResponse.json({ id: order.id, url }, { status: 201 });
    } catch (error) {
      console.error("Could not start payment:", error);
      return NextResponse.json({ id: order.id, paymentError: true }, { status: 201 });
    }
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
