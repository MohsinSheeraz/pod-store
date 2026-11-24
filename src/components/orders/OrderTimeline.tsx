import { ORDER_STATUS_LABEL } from "@/lib/order-views";

const STEPS = ["PAID", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as const;

// Where an order is on its way. A cancelled order shows as cancelled instead.
export default function OrderTimeline({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return <p className="timeline-cancelled">This order was cancelled.</p>;
  }
  const at = status === "PENDING" ? -1 : STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <ol className="timeline" aria-label="Order progress">
      {STEPS.map((s, i) => (
        <li key={s} className={i < at ? "is-done" : i === at ? "is-now" : undefined}>
          <span className="timeline-dot" aria-hidden="true" />
          {ORDER_STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
