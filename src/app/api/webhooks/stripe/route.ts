import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { markPaid } from "@/lib/payments";

// Stripe tells us when a payment finishes. This is the only thing that turns an order from
// PENDING to PAID in production. Set the endpoint to  https://<your site>/api/webhooks/stripe
// with the events checkout.session.completed and checkout.session.async_payment_succeeded.

type StripeEvent = {
  type: string;
  data: {
    object: {
      client_reference_id?: string | null;
      payment_status?: string;
      payment_intent?: string | null;
      metadata?: { orderId?: string };
    };
  };
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw text, not parsed JSON.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const s = event.data.object;
    const orderId = s.client_reference_id || s.metadata?.orderId;
    if (orderId && s.payment_status === "paid") {
      try {
        await markPaid(orderId, s.payment_intent ?? null);
      } catch (error) {
        console.error("Webhook: could not mark order paid:", error);
        // A 500 makes Stripe retry later.
        return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
