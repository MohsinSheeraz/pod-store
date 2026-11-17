"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { downloadMockups, type ExportView } from "@/lib/mockup-export";
import type { Shape } from "@/components/product/ProductSilhouette";

export default function MockupDownload({
  shape,
  fill,
  baseName,
  views,
}: {
  shape: Shape;
  fill: string;
  baseName: string;
  views: ExportView[];
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await downloadMockups({ shape, fill, baseName, views });
    } catch {
      toast.error("Could not create the download. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={busy}>
      {busy ? "Preparing..." : "Download mockup"}
    </button>
  );
}
