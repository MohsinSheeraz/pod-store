import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { companyName, supportEmail } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const co = companyName();
  const email = supportEmail();
  return (
    <LegalPage title="Privacy policy" updated="November 2026">
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your name, email address and a hashed (never readable) password.
        </li>
        <li>
          <strong>Orders:</strong> what you ordered, your delivery address and phone number, and the order history.
        </li>
        <li>
          <strong>Artwork:</strong> the images you upload and the designs and text you place on products.
        </li>
        <li>
          <strong>Payment:</strong> handled by our payment provider. We receive a payment reference and the result,
          never your card number.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run your account, make and ship your orders, send receipts and shipping updates, answer your questions and
        keep the site secure. We don&apos;t sell your data and we don&apos;t use it for advertising.
      </p>

      <h2>Who sees it</h2>
      <p>
        Only the people and services needed to do the above: our payment provider, our email provider, our hosting and
        file storage, and the carrier that delivers your parcel (they get your name, address and phone). They may only
        use the data for that purpose.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We use one sign-in cookie so you stay logged in, and your browser remembers your light or dark theme choice. We
        don&apos;t use advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data stays until you ask us to delete the account. Order records are kept as long as the law requires
        for accounting. Uploaded artwork stays in your account until you or we remove it.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct, export or delete your data, and to object to how we use it. Write to{" "}
        <a href={`mailto:${email}`}>{email}</a> and we&apos;ll respond within 30 days. If you think we handled your data
        wrongly you can also complain to your local data protection authority.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed, connections are encrypted, and access to order data is limited to staff who need it. No
        system is perfectly secure, so please use a strong password that you don&apos;t use anywhere else.
      </p>

      <h2>Who we are</h2>
      <p>
        The data controller is {co}. Contact: <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
