import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { pricingConfig, supportEmail } from "@/lib/env";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Shipping policy" };

export default function ShippingPage() {
  const cfg = pricingConfig();
  const email = supportEmail();
  return (
    <LegalPage title="Shipping policy" updated="November 2026">
      <h2>Made to order</h2>
      <p>
        Nothing sits in a warehouse. Your order is printed after you pay, which usually takes 2 to 5 business days
        before it ships. Busy periods can take a little longer.
      </p>

      <h2>Shipping cost</h2>
      <p>
        Shipping is {formatMoney(cfg.shippingFlat)}
        {cfg.freeShippingOver > 0 && (
          <>
            , and free when your items come to {formatMoney(cfg.freeShippingOver)} or more
          </>
        )}
        . The exact amount is shown at checkout before you pay.
      </p>

      <h2>Delivery times and tracking</h2>
      <p>
        Delivery time depends on the carrier and where you live. When your order ships we email you a tracking number,
        and you can also find it on the order page in your account.
      </p>

      <h2>Address</h2>
      <p>
        Please check your delivery address and phone number carefully. We can&apos;t change an address once the parcel has
        shipped, and parcels returned because of a wrong address may be sent again at your cost.
      </p>

      <h2>Customs and duties</h2>
      <p>
        For international orders, import duties and local taxes are set by your country and are not included in the
        price. They are paid by the person receiving the parcel.
      </p>

      <h2>Help</h2>
      <p>
        Parcel late or lost? Write to <a href={`mailto:${email}`}>{email}</a> with your order number.
      </p>
    </LegalPage>
  );
}
