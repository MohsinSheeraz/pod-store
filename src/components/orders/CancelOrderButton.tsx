"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not cancel the order.");
        return;
      }
      toast.success("Order cancelled.");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-danger btn-block" onClick={cancel} disabled={busy}>
      {busy ? "Cancelling..." : "Cancel order"}
    </button>
  );
}
