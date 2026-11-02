"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QtyStepper from "@/components/ui/QtyStepper";
import { MAX_QTY } from "@/lib/cart";

export default function CartItemControls({
  id,
  quantity,
}: {
  id: string;
  quantity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function request(init: RequestInit, failure: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/cart/items/${id}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || failure);
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
    <div className="cart-controls">
      <QtyStepper
        value={quantity}
        max={MAX_QTY}
        disabled={busy}
        onChange={(n) =>
          request({ method: "PATCH", body: JSON.stringify({ quantity: n }) }, "Could not update quantity.")
        }
      />
      <button
        type="button"
        className="link-button"
        disabled={busy}
        onClick={() => request({ method: "DELETE" }, "Could not remove this item.")}
      >
        Remove
      </button>
    </div>
  );
}
