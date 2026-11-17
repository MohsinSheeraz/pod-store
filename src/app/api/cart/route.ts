import { NextResponse } from "next/server";
import { open } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FONT_KEYS, SCALE_MAX, SCALE_MIN, textLimit } from "@/lib/placement";
import { exclusiveConflict, validatePlacement, type LayerSpec } from "@/lib/placement-rules";
import { readImageSize } from "@/lib/image-size";

const FONTS: string[] = FONT_KEYS;
const HEX = /^#[0-9a-fA-F]{6}$/;
const PUBLIC_DIR = path.join(process.cwd(), "public");

const inRange = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

const validPlacement = (p: unknown) => {
  const pl = p as Record<string, unknown> | null;
  return (
    !!pl &&
    inRange(pl.x, 0, 1) &&
    inRange(pl.y, 0, 1) &&
    inRange(pl.scale, SCALE_MIN, SCALE_MAX) &&
    inRange(pl.rotation, -180, 180)
  );
};

// Width / height of a design file, or null when it can't be read. Only files under
// /public are read; anything else (external catalog art) skips the height check.
async function designAspect(imageUrl: string): Promise<number | null> {
  if (!imageUrl.startsWith("/")) return null;
  const file = path.join(PUBLIC_DIR, imageUrl);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
  try {
    const handle = await open(file, "r");
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(256 * 1024), 0, 256 * 1024, 0);
      const size = readImageSize(buffer.subarray(0, bytesRead));
      return size ? size.width / size.height : null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

type PrintInput = {
  zoneId?: unknown;
  designId?: unknown;
  text?: unknown;
  font?: unknown;
  color?: unknown;
  textStyle?: unknown;
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
    placement: Record<string, number | boolean>;
  }[] = [];
  // A print area can hold one design and one line of text.
  const seen = new Set<string>();

  for (const raw of prints as PrintInput[]) {
    const zone = variant.product.zones.find((z) => z.id === raw?.zoneId);
    const isText = typeof raw?.designId !== "string";
    if (!zone || seen.has(`${zone.id}:${isText}`)) {
      return NextResponse.json({ error: "Invalid print area." }, { status: 400 });
    }
    seen.add(`${zone.id}:${isText}`);

    if (!validPlacement(raw.placement)) {
      return NextResponse.json({ error: "Artwork placement is invalid." }, { status: 400 });
    }
    const p = raw.placement as { x: number; y: number; scale: number; rotation: number };
    const placement = { x: p.x, y: p.y, scale: p.scale, rotation: p.rotation };

    // A print is either artwork (designId) or initials (text). Monogram zones take both;
    // every other zone takes artwork only.
    if (typeof raw.designId === "string") {
      if (raw.text !== undefined) {
        return NextResponse.json({ error: "Choose artwork or text, not both." }, { status: 400 });
      }
      const design = await prisma.design.findUnique({ where: { id: raw.designId } });
      if (!design || (!design.isCatalog && design.ownerId !== session.user.id)) {
        return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
      }

      const spec: LayerSpec = { kind: "image", aspect: await designAspect(design.imageUrl) };
      const placementError = validatePlacement(zone, spec, placement);
      if (placementError) {
        return NextResponse.json({ error: placementError }, { status: 400 });
      }
      data.push({ zoneId: zone.id, designId: design.id, placement });
    } else if (raw.text !== undefined) {
      const text = typeof raw.text === "string" ? raw.text.trim() : "";
      const max = textLimit(zone);
      if (!text || text.length > max) {
        return NextResponse.json({ error: `Text must be 1 to ${max} characters.` }, { status: 400 });
      }
      const st = (raw.textStyle ?? {}) as Record<string, unknown>;
      if (
        (st.curve !== undefined && !inRange(st.curve, -100, 100)) ||
        (st.bold !== undefined && typeof st.bold !== "boolean") ||
        (st.italic !== undefined && typeof st.italic !== "boolean")
      ) {
        return NextResponse.json({ error: "Invalid text style." }, { status: 400 });
      }
      if (typeof raw.font !== "string" || !FONTS.includes(raw.font)) {
        return NextResponse.json({ error: "Invalid font." }, { status: 400 });
      }
      if (typeof raw.color !== "string" || !HEX.test(raw.color)) {
        return NextResponse.json({ error: "Invalid text color." }, { status: 400 });
      }

      const spec: LayerSpec = { kind: "text", chars: text.length };
      const placementError = validatePlacement(zone, spec, placement);
      if (placementError) {
        return NextResponse.json({ error: placementError }, { status: 400 });
      }
      data.push({
        zoneId: zone.id,
        text,
        font: raw.font,
        color: raw.color,
        placement: {
          ...placement,
          curve: typeof st.curve === "number" ? st.curve : 0,
          bold: st.bold === true,
          italic: st.italic === true,
        },
      });
    } else {
      return NextResponse.json({ error: "Add artwork to this print area." }, { status: 400 });
    }
  }

  const usedZones = [...new Set(data.map((d) => d.zoneId))].flatMap((id) => {
    const z = variant.product.zones.find((zone) => zone.id === id);
    return z ? [{ key: z.key, label: z.label }] : [];
  });
  const conflict = exclusiveConflict(usedZones);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 400 });
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