import { ORDER_STATUS_LABEL, type OrderStatusKey } from "@/lib/order-views";

export default function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABEL[status as OrderStatusKey] ?? status;
  return (
    <span className="status-badge" data-status={status}>
      {label}
    </span>
  );
}
