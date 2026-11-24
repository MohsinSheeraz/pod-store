"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// For an order that is saved but not paid yet: opens the payment page (or finishes a test payment).
export default function PayNowButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not start payment.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-glow btn-block" onClick={pay} disabled={busy}>
      {busy ? "Opening payment..." : "Complete payment"}
    </button>
  );
}
