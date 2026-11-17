import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { shapeFor } from "@/components/product/ProductSilhouette";
import {
  blockedReason,
  cartInclude,
  parseShipping,
  TEST_PAYMENTS,
  toMoney,
  unitCents,
  variantLabel,
} from "@/lib/orders";

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

  try {
    const order = await prisma.$transaction(async (tx) => {
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

      let totalCents = 0;

      const lines: Prisma.OrderItemCreateWithoutOrderInput[] = items.map((item) => {
        const { variant } = item;
        const { product } = variant;
        const unit = unitCents(item);
        totalCents += unit * item.quantity;

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

      const created = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          total: toMoney(totalCents),
          status: TEST_PAYMENTS ? "PAID" : "PENDING",
          shippingAddress: shipping.value,
          items: { create: lines },
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout error:", error);
    // Show the cause while developing; keep it generic in production.
    const detail = error instanceof Error ? error.message.trim().slice(-240) : "";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" || !detail ? "Something went wrong." : `Something went wrong: ${detail}` },
      { status: 500 }
    );
  }
}