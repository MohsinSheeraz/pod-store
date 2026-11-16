"use client";

import { useState } from "react";
import Link from "next/link";
import type { DesignDTO } from "@/components/product/types";

type Tab = "library" | "mine";

type Props = {
  catalog: DesignDTO[];
  mine: DesignDTO[];
  selectedId: string | null;
  loggedIn: boolean;
  uploading: boolean;
  onPick: (design: DesignDTO) => void;
  onUpload: () => void;
};

// Choose a ready-made design, one of your earlier uploads, or upload a new file.
export default function DesignPicker({
  catalog,
  mine,
  selectedId,
  loggedIn,
  uploading,
  onPick,
  onUpload,
}: Props) {
  const [tab, setTab] = useState<Tab>(catalog.length > 0 ? "library" : "mine");
  const items = tab === "library" ? catalog : mine;

  return (
    <div className="picker">
      <div className="picker-tabs" role="group" aria-label="Design source">
        <button
          type="button"
          className="chip"
          aria-pressed={tab === "library"}
          onClick={() => setTab("library")}
        >
          Ready-made
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={tab === "mine"}
          onClick={() => setTab("mine")}
        >
          My designs{mine.length > 0 ? ` (${mine.length})` : ""}
        </button>
      </div>

      <div className="picker-grid">
        {loggedIn ? (
          <button
            type="button"
            className="picker-upload"
            disabled={uploading}
            onClick={onUpload}
          >
            <span aria-hidden="true">{uploading ? "…" : "+"}</span>
            {uploading ? "Uploading" : "Upload"}
          </button>
        ) : null}

        {items.map((d) => (
          <button
            key={d.id}
            type="button"
            className="picker-item"
            aria-pressed={d.id === selectedId}
            title={d.name}
            onClick={() => onPick(d)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.imageUrl} alt={d.name} draggable={false} loading="lazy" />
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="hint">
          {tab === "mine"
            ? loggedIn
              ? "Designs you upload show up here, ready to reuse on any product."
              : "Log in to see your saved designs."
            : "No ready-made designs yet."}
        </p>
      )}

      {!loggedIn && (
        <p className="login-note">
          <Link href="/login">Log in</Link> or <Link href="/signup">create an account</Link> to
          upload your own artwork and add to cart.
        </p>
      )}
    </div>
  );
}
