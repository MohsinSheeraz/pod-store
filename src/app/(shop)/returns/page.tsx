import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { supportEmail } from "@/lib/env";

export const metadata: Metadata = { title: "Returns and refunds" };

export default function ReturnsPage() {
  const email = supportEmail();
  return (
    <LegalPage title="Returns and refunds" updated="November 2026">
      <h2>Custom items</h2>
      <p>
        Every item is printed just for you, so we can&apos;t take it back because you changed your mind, chose the wrong
        size, or didn&apos;t like how the design looks. Please check the size and the preview before you order.
      </p>

      <h2>When we will fix it</h2>
      <p>We will reprint or refund, your choice, when:</p>
      <ul>
        <li>the item arrives damaged or faulty,</li>
        <li>the print is clearly different from the design you ordered (wrong position, missing or faded print),</li>
        <li>you receive the wrong product, colour or size.</li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Write to <a href={`mailto:${email}`}>{email}</a> within 30 days of delivery with your order number and a clear
        photo of the problem. We&apos;ll answer within 2 business days. You don&apos;t need to send the item back unless we ask.
      </p>

      <h2>Cancelling an order</h2>
      <p>
        You can cancel from your order page until production starts, and you&apos;ll be refunded in full. After that the
        item is already being made and can&apos;t be cancelled.
      </p>

      <h2>Refunds</h2>
      <p>
        Refunds go back to the original payment method and usually appear within 5 to 10 business days, depending on
        your bank.
      </p>
    </LegalPage>
  );
}
