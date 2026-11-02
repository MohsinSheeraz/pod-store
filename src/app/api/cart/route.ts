import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TEXT_MAX_LENGTH } from "@/lib/placement";

const FONTS = ["sans", "display", "serif"];
const HEX = /^#[0-9a-fA-F]{6}$/;

const inRange = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

const validPlacement = (p: unknown) => {
  const pl = p as Record<string, unknown> | null;
  return (
    !!pl &&
    inRange(pl.x, 0, 1) &&
    inRange(pl.y, 0, 1) &&
    inRange(pl.scale, 0.05, 3) &&
    inRange(pl.rotation, -180, 180)
  );
};

type PrintInput = {
  zoneId?: unknown;
  designId?: unknown;
  text?: unknown;
  font?: unknown;
  color?: unknown;
  placement?: unknown;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Log in to add items to your cart." }, { status: 401 });
  }

  let body: { variantId?: unknown; quantity?: unknown; prints?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { variantId, quantity, prints } = body;

  if (typeof variantId !== "string" || !Array.isArray(prints) || prints.length === 0) {
    return NextResponse.json(
      { error: "Choose a product option and add artwork or text." },
      { status: 400 }
    );
  }

  const qty = quantity === undefined ? 1 : quantity;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 20) {
    return NextResponse.json({ error: "Quantity must be between 1 and 20." }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { include: { zones: true } } },
  });
  if (!variant || !variant.available || !variant.product.active) {
    return NextResponse.json({ error: "This option is no longer available." }, { status: 404 });
  }

  const data: {
    zoneId: string;
    designId?: string;
    text?: string;
    font?: string;
    color?: string;
    placement: { x: number; y: number; scale: number; rotation: number };
  }[] = [];
  const seenZones = new Set<string>();

  for (const raw of prints as PrintInput[]) {
    const zone = variant.product.zones.find((z) => z.id === raw?.zoneId);
    if (!zone || seenZones.has(zone.id)) {
      return NextResponse.json({ error: "Invalid print area." }, { status: 400 });
    }
    seenZones.add(zone.id);

    if (!validPlacement(raw.placement)) {
      return NextResponse.json({ error: "Artwork placement is invalid." }, { status: 400 });
    }
    const p = raw.placement as { x: number; y: number; scale: number; rotation: number };
    const placement = { x: p.x, y: p.y, scale: p.scale, rotation: p.rotation };

    if (zone.kind === "TEXT") {
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      if (!text || text.length > TEXT_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Text must be 1 to ${TEXT_MAX_LENGTH} characters.` },
          { status: 400 }
        );
      }
      if (typeof raw.font !== "string" || !FONTS.includes(raw.font)) {
        return NextResponse.json({ error: "Invalid font." }, { status: 400 });
      }
      if (typeof raw.color !== "string" || !HEX.test(raw.color)) {
        return NextResponse.json({ error: "Invalid text color." }, { status: 400 });
      }
      data.push({ zoneId: zone.id, text, font: raw.font, color: raw.color, placement });
    } else {
      if (typeof raw.designId !== "string") {
        return NextResponse.json({ error: "Add artwork to this print area." }, { status: 400 });
      }
      const design = await prisma.design.findUnique({ where: { id: raw.designId } });
      if (!design || (!design.isCatalog && design.ownerId !== session.user.id)) {
        return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
      }
      data.push({ zoneId: zone.id, designId: design.id, placement });
    }
  }

  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      variantId,
      quantity: qty,
      prints: { create: data },
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
