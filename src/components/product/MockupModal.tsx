"use client";

import { useEffect, useState } from "react";
import type { Shape } from "@/components/product/ProductSilhouette";
import { renderMockups, renderPhotoMockup, type ExportZone, type ExportView } from "@/lib/mockup-export";
import { PHOTO_MOCKUPS } from "@/lib/mockup-photos";

type Item = { id: string; label: string; url: string; blob: Blob };

type Props = {
  shape: Shape;
  fill: string;
  name: string;
  // Every print on the product, tagged with its print area and the view it belongs to
  prints: (ExportZone & { view: ExportView["view"] })[];
  onClose: () => void;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// "Your mockups": the design on a model (front and back) and on the plain product.
export default function MockupModal({ shape, fill, name, prints, onClose }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const urls: string[] = [];

    (async () => {
      const out: Item[] = [];
      const add = (id: string, label: string, blob: Blob) => {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        out.push({ id, label, url, blob });
      };

      const photos = PHOTO_MOCKUPS[shape] ?? [];
      const frontBack = prints.filter((p) => p.view === "front" || p.view === "back");

      for (const t of photos) {
        const zones = frontBack.filter((p) => p.key && t.areas[p.key] && p.view === (t.id === "model-back" ? "back" : "front"));
        if (zones.length === 0) continue;
        add(t.id, t.label, await renderPhotoMockup({ template: t, fill, zones }));
      }

      // Products without photos (and sleeve prints) use the illustrated mockup.
      const photoViews = new Set(photos.length > 0 ? ["front", "back"] : []);
      const views = (["front", "back", "left", "right"] as const)
        .filter((v) => !photoViews.has(v))
        .map((v) => ({ view: v, zones: prints.filter((p) => p.view === v) }));
      for (const r of await renderMockups({ shape, fill, views })) {
        add(`flat-${r.view}`, r.view === "front" || r.view === "back" ? `${r.view === "front" ? "Front" : "Back"}` : `${r.view === "left" ? "Left" : "Right"} sleeve`, r.blob);
      }

      if (live) setItems(out);
    })().catch(() => live && setError("Could not create the mockups. Try again."));

    return () => {
      live = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [shape, fill, prints]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Your mockups" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Your mockups</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {error && <p className="warn">{error}</p>}
        {!items && !error && <p className="hint">Creating your mockups...</p>}
        {items && items.length === 0 && <p className="hint">Add a design to a print area to see it here.</p>}

        {items && items.length > 0 && (
          <>
            <div className="mockup-gallery">
              {items.map((it) => (
                <figure key={it.id} className="mockup-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={`${name} ${it.label}`} />
                  <figcaption>
                    <span>{it.label}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => save(it.blob, `${slug(name)}-${slug(it.label)}.png`)}
                    >
                      Download
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => items.forEach((it, i) => setTimeout(() => save(it.blob, `${slug(name)}-${slug(it.label)}.png`), i * 350))}
            >
              Download all
            </button>
          </>
        )}
      </div>
    </div>
  );
}
