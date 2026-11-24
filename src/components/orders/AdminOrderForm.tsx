"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/order-views";

type Props = { orderId: string; status: string; trackingNumber: string };

// Admin: move an order through production and shipping, and record the tracking number.
export default function AdminOrderForm({ orderId, status, trackingNumber }: Props) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [tracking, setTracking] = useState(trackingNumber);
  const [busy, setBusy] = useState(false);

  const dirty = nextStatus !== status || tracking.trim() !== trackingNumber;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, trackingNumber: tracking }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save.");
        return;
      }
      toast.success("Order updated.");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="form admin-order-form">
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tracking">Tracking number</label>
        <input
          id="tracking"
          type="text"
          maxLength={80}
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Added when the order ships"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || !dirty}>
        {busy ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
