import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/email-templates";
import { orderRef } from "@/lib/order-views";
import { createCheckoutSession, createRefund, expireSession, retrieveSession } from "@/lib/stripe";

const cents = (v: unknown) => Math.round(Number(v) * 100);

async function sendOrderConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { name: true, email: true } }, items: true },
  });
  if (!order) return;
  const mail = orderConfirmationEmail({
    reference: orderRef(order.id),
    name: order.user.name,
    lines: order.items.map((i) => ({
      label: `${i.productName} (${i.variantLabel})`,
      quantity: i.quantity,
      total: Number(i.unitPrice) * i.quantity,
    })),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    total: Number(order.total),
    url: `${siteUrl()}/orders/${order.id}`,
  });
  await sendEmail({ to: order.user.email, ...mail });
}

/**
 * Marks an order paid. Safe to call twice (webhook and the success page can both do it): only the
 * first call changes anything, and only that one sends the confirmation email.
 */
export async function markPaid(orderId: string, paymentRef: string | null): Promise<boolean> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), paymentRef },
  });
  if (count === 1) {
    sendOrderConfirmation(orderId).catch((e) => console.error("Order confirmation failed:", e));
  }
  return count === 1;
}

/** Opens a Stripe Checkout page for a pending order and remembers the session. */
export async function startStripePayment(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { email: true } } },
  });
  if (!order || order.status !== "PENDING") throw new Error("Order is not waiting for payment");

  const session = await createCheckoutSession({
    orderId: order.id,
    reference: orderRef(order.id),
    amountCents: cents(order.total),
    email: order.user.email,
    successUrl: `${siteUrl()}/orders/${order.id}?placed=1`,
    cancelUrl: `${siteUrl()}/orders/${order.id}?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a payment page");

  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return session.url;
}

/** Asks Stripe whether a pending order was paid, in case the webhook has not arrived yet. */
export async function syncStripePayment(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING" || !order.stripeSessionId) return false;
  try {
    const session = await retrieveSession(order.stripeSessionId);
    if (session.payment_status === "paid") {
      return markPaid(order.id, session.payment_intent);
    }
  } catch (error) {
    console.error("Stripe sync failed:", error);
  }
  return false;
}

/**
 * Gives the money back (or closes the payment page) when an order is cancelled.
 * Throws if Stripe refuses, so the caller can keep the order as it was and tell the person.
 */
export async function undoPayment(order: {
  id: string;
  status: string;
  paymentRef: string | null;
  stripeSessionId: string | null;
}) {
  if (order.status === "PENDING") {
    if (order.stripeSessionId && process.env.STRIPE_SECRET_KEY) {
      // Best effort: an already expired or paid session just errors, which is fine here.
      await expireSession(order.stripeSessionId).catch(() => undefined);
    }
    return;
  }
  // A real Stripe payment has a payment intent id. Simulated payments have nothing to refund.
  if (order.paymentRef?.startsWith("pi_")) {
    await createRefund(order.paymentRef, `refund-${order.id}`);
  }
}
