import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { companyName, supportEmail } from "@/lib/env";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  const co = companyName();
  const email = supportEmail();
  return (
    <LegalPage title="Terms of service" updated="November 2026">
      <h2>1. About these terms</h2>
      <p>
        These terms apply when you use this website and buy products from {co}. By creating an account or placing an
        order you agree to them. If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must give correct details and keep your password safe. You are responsible for what happens under your
        account. Tell us at <a href={`mailto:${email}`}>{email}</a> if you think someone else has used it.
      </p>

      <h2>3. Custom products</h2>
      <p>
        Every item is printed to order from the design you place. The on-screen and photo mockups are a guide: real
        colours, print position and fabric can differ a little. Only the part of a design that sits inside the print
        area is printed. Please check your design and the preview before you pay.
      </p>

      <h2>4. Your artwork and your rights</h2>
      <p>
        You keep ownership of what you upload. By uploading it you tell us that you own it or have permission to use
        it, and that it doesn&apos;t infringe anyone&apos;s copyright, trademark or other rights. You give us permission to
        copy, resize and print it only to make and deliver your order, and to show it to you in your account.
      </p>
      <p>
        We may refuse or cancel an order, and remove a design, that contains unlawful, hateful or sexually explicit
        material, or that copies a brand, character or logo you don&apos;t have rights to. If we cancel for this reason you
        are refunded in full.
      </p>

      <h2>5. Prices and payment</h2>
      <p>
        Prices are shown before you pay and include the print areas you choose. Shipping and any tax are added at
        checkout. Payment is taken by our payment provider; we never see or store your card details. An order is
        confirmed when payment is received.
      </p>

      <h2>6. Production, shipping and returns</h2>
      <p>
        See our <Link href="/shipping">shipping policy</Link> and <Link href="/returns">returns policy</Link>. Because
        items are made to order, they can&apos;t be returned just because you changed your mind.
      </p>

      <h2>7. Our responsibility</h2>
      <p>
        We take care to print what you ordered. If something is wrong with it, we will fix it as described in the
        returns policy. Nothing here limits rights you have by law. Apart from that, we are not liable for indirect or
        consequential losses, and our total liability for an order is limited to what you paid for it.
      </p>

      <h2>8. Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version. Questions? Write to{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
