import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_QTY } from "@/lib/cart";

type Ctx = { params: Promise<{ id: string }> };

// Only ever touch an item that belongs to the signed-in user's own cart.
async function findOwnItem(id: string, userId: string) {
  return prisma.cartItem.findFirst({ where: { id, cart: { userId } } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Log in to edit your cart." }, { status: 401 });
  }

  let body: { quantity?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { quantity } = body;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    return NextResponse.json(
      { error: `Quantity must be between 1 and ${MAX_QTY}.` },
      { status: 400 }
    );
  }

  const { id } = await params;
  const item = await findOwnItem(id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  await prisma.cartItem.update({ where: { id }, data: { quantity } });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Log in to edit your cart." }, { status: 401 });
  }

  const { id } = await params;
  const item = await findOwnItem(id, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
