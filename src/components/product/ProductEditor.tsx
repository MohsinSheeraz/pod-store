"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatMoney } from "@/lib/format";
import {
  clamp,
  dpiFor,
  fitPlacement,
  fitTextScale,
  isDark,
  MIN_DPI,
  NO_GUIDES,
  SCALE_MAX,
  SCALE_MIN,
  TEXT_COLORS,
  TEXT_FONTS,
  TEXT_MAX_LENGTH,
  type Guides,
} from "@/lib/placement";
import {
  constrainPlacement,
  layerKindAllowed,
  scaleLimit,
  usableZones,
  zoneRole,
  type LayerMetrics,
} from "@/lib/placement-rules";
import ProductSilhouette, { shapeFor } from "@/components/product/ProductSilhouette";
import ZoneFrame from "@/components/product/ZoneFrame";
import PlacementControls from "@/components/product/PlacementControls";
import QtyStepper from "@/components/ui/QtyStepper";
import type {
  DesignDTO,
  FontKey,
  Layer,
  Placement,
  ProductDTO,
  ViewKey,
  ZoneDTO,
} from "@/components/product/types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

function loadImageSize(src: string) {
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

function placementNote(zone: ZoneDTO) {
  return zoneRole(zone) === "left-chest"
    ? "Text only. Prints on the wearer’s left chest, which is on your right when you look at the front."
    : `${zone.widthIn} × ${zone.heightIn} in print area`;
}

const layerIdentity = (layer: Layer | undefined) =>
  layer ? (layer.kind === "image" ? layer.design.id : "text") : "none";

type Props = { product: ProductDTO; loggedIn: boolean };

export default function ProductEditor({ product, loggedIn }: Props) {
  // Only offer print areas whose position follows the product's placement rules.
  const zones = useMemo(() => usableZones(product.zones), [product.zones]);

  if (zones.length === 0) {
    return (
      <div className="editor-alert" role="alert">
        <p>This product can’t be customized right now. Please check back soon.</p>
        <Link href="/#products" className="btn btn-ghost btn-sm">
          Back to products
        </Link>
      </div>
    );
  }

  return <Customizer product={{ ...product, zones }} loggedIn={loggedIn} />;
}

function Customizer({ product, loggedIn }: Props) {
  const router = useRouter();
  const zones = product.zones;

  const firstVariant = product.variants.find((v) => v.available) ?? product.variants[0];
  const [color, setColor] = useState(firstVariant.color);
  const [size, setSize] = useState(firstVariant.size);
  const [quantity, setQuantity] = useState(1);

  const [layers, setLayers] = useState<Record<string, Layer>>({});
  const [metricsMap, setMetricsMap] = useState<Record<string, LayerMetrics>>({});
  const [activeKey, setActiveKey] = useState(zones[0].key);
  const [view, setView] = useState<ViewKey>(zones[0].view);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  // The print area an upload started from, so a slow upload lands in the right place.
  const uploadZoneRef = useRef(zones[0].key);

  const colors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of product.variants) {
      if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
    }
    return [...seen].map(([name, hex]) => ({ name, hex }));
  }, [product.variants]);

  const views = useMemo(() => [...new Set(zones.map((z) => z.view))], [zones]);

  // Smaller print areas stack above larger ones they overlap (e.g. left chest over front).
  const stack = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of views) {
      zones
        .filter((z) => z.view === v)
        .sort((a, b) => b.w * b.h - a.w * a.h)
        .forEach((z, i) => {
          map[z.key] = i + 1;
        });
    }
    return map;
  }, [zones, views]);

  const sizes = product.variants.filter((v) => v.color === color);
  const variant = product.variants.find((v) => v.color === color && v.size === size);
  const colorHex = colors.find((c) => c.name === color)?.hex ?? "#ffffff";
  const dark = isDark(colorHex);
  const shape = shapeFor(product.slug, product.categorySlug);

  const activeZone = zones.find((z) => z.key === activeKey) ?? zones[0];
  const activeLayer: Layer | undefined = layers[activeZone.key];
  const activeMetrics = activeLayer ? metricsMap[activeZone.key] : undefined;
  const printed = zones.filter((z) => layers[z.key]);
  const feeZones = printed.filter((z) => z.fee > 0);

  const unitPrice =
    product.basePrice +
    (variant?.priceDelta ?? 0) +
    feeZones.reduce((sum, z) => sum + z.fee, 0);
  const total = unitPrice * quantity;

  function selectZone(key: string) {
    const z = zones.find((zone) => zone.key === key);
    if (!z) return;
    setActiveKey(key);
    setView(z.view);
    setGuides(NO_GUIDES);
  }

  function changeView(next: ViewKey) {
    setView(next);
    if (activeZone.view !== next) {
      const z = zones.find((zone) => zone.view === next);
      if (z) setActiveKey(z.key);
    }
    setGuides(NO_GUIDES);
  }

  function changeColor(name: string) {
    setColor(name);
    const options = product.variants.filter((v) => v.color === name && v.available);
    if (!options.some((v) => v.size === size)) {
      setSize(options[0]?.size ?? size);
    }
  }

  function setLayer(key: string, layer: Layer | undefined) {
    setLayers((prev) => {
      const next = { ...prev };
      if (layer) next[key] = layer;
      else delete next[key];
      return next;
    });
    // The old layer's measurements no longer apply.
    setMetricsMap((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setAdded(false);
  }

  // Every placement change goes through here, so a layer can never leave its zone.
  function updatePlacement(key: string, patch: Partial<Placement>) {
    setLayers((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const merged = { ...cur.placement, ...patch };
      const m = metricsMap[key];
      const placement = m
        ? constrainPlacement(merged, m.unit, m.frame)
        : {
            ...merged,
            x: clamp(merged.x, 0, 1),
            y: clamp(merged.y, 0, 1),
            scale: clamp(merged.scale, SCALE_MIN, SCALE_MAX),
          };
      return { ...prev, [key]: { ...cur, placement } };
    });
    setAdded(false);
  }

  // The zone reports what it measured (after text edits, resizes, window changes). Keep the
  // numbers and pull the layer back inside if the new size no longer fits.
  const handleMetrics = useCallback((key: string, m: LayerMetrics) => {
    setMetricsMap((prev) => {
      const cur = prev[key];
      const same =
        cur &&
        Math.abs(cur.unit.w - m.unit.w) < 0.5 &&
        Math.abs(cur.unit.h - m.unit.h) < 0.5 &&
        Math.abs(cur.frame.w - m.frame.w) < 0.5 &&
        Math.abs(cur.frame.h - m.frame.h) < 0.5;
      return same ? prev : { ...prev, [key]: m };
    });
    setLayers((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = constrainPlacement(cur.placement, m.unit, m.frame);
      return next === cur.placement ? prev : { ...prev, [key]: { ...cur, placement: next } };
    });
  }, []);

  function setText(value: string) {
    const key = activeZone.key;
    const text = value.slice(0, TEXT_MAX_LENGTH);
    setAdded(false);
    if (!text.trim()) {
      setLayer(key, undefined);
      return;
    }
    setLayers((prev) => {
      const cur = prev[key];
      if (cur?.kind === "text") {
        // Keep the text fitted to the print area while typing, unless the shopper
        // has resized it by hand.
        const untouched =
          Math.abs(cur.placement.scale - fitTextScale(activeZone, cur.text.length)) < 0.001;
        const scale = untouched ? fitTextScale(activeZone, text.length) : cur.placement.scale;
        return { ...prev, [key]: { ...cur, text, placement: { ...cur.placement, scale } } };
      }
      return {
        ...prev,
        [key]: {
          kind: "text",
          text,
          font: "display",
          color: dark ? "#FFFFFF" : "#14161B",
          placement: { x: 0.5, y: 0.5, scale: fitTextScale(activeZone, text.length), rotation: 0 },
        },
      };
    });
  }

  function patchText(patch: { font?: FontKey; color?: string }) {
    const key = activeZone.key;
    setAdded(false);
    setLayers((prev) => {
      const cur = prev[key];
      if (cur?.kind !== "text") return prev;
      return { ...prev, [key]: { ...cur, ...patch } };
    });
  }

  async function uploadFile(file: File, zoneKey: string) {
    const zone = zones.find((z) => z.key === zoneKey);
    if (!zone) return;
    if (!layerKindAllowed(zone, "image")) {
      toast.error("This print area takes text, not artwork.");
      return;
    }
    if (!loggedIn) {
      toast.error("Log in to upload artwork.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Upload a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image must be under 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed.");
        return;
      }

      const design: DesignDTO = data.design;
      const dims = await loadImageSize(design.imageUrl);
      const aspect = dims.w / dims.h;

      setLayer(zone.key, {
        kind: "image",
        design,
        aspect,
        pixelW: dims.w,
        placement: fitPlacement(zone, aspect),
      });
      selectZone(zone.key);
    } catch {
      toast.error("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file, uploadZoneRef.current);
  }

  function openPicker(zoneKey: string) {
    uploadZoneRef.current = zoneKey;
    selectZone(zoneKey);
    fileRef.current?.click();
  }

  function focusText(zoneKey: string) {
    selectZone(zoneKey);
    requestAnimationFrame(() => textRef.current?.focus());
  }

  function emptyActionFor(z: (typeof zones)[number]) {
    if (z.kind === "TEXT") return { label: "Add text", run: () => focusText(z.key) };
    if (!loggedIn) return { label: "Log in to upload", run: () => router.push("/login") };
    return { label: uploading ? "Uploading..." : "Upload", run: () => openPicker(z.key) };
  }

  async function addToCart() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (!variant) return;
    if (printed.length === 0) {
      toast.error("Add artwork or text to at least one print area.");
      return;
    }

    setAdding(true);
    setAdded(false);
    setCartError("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.id,
          quantity,
          prints: printed.map((z) => {
            const l = layers[z.key];
            return l.kind === "image"
              ? { zoneId: z.id, designId: l.design.id, placement: l.placement }
              : {
                  zoneId: z.id,
                  text: l.text,
                  font: l.font,
                  color: l.color,
                  placement: l.placement,
                };
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Everything the shopper made stays on screen so they can fix it and retry.
        setCartError(data.error || "Something went wrong. Your design is still here.");
        return;
      }

      setAdded(true);
      router.refresh();
    } catch {
      setCartError("Could not reach the server. Your design is still here. Try again.");
    } finally {
      setAdding(false);
    }
  }

  const lowDpi =
    activeLayer?.kind === "image"
      ? dpiFor(activeLayer.pixelW, activeLayer.placement.scale, activeZone.widthIn)
      : null;
  const printWidthIn = activeLayer ? activeLayer.placement.scale * activeZone.widthIn : 0;

  const activeLimit =
    activeLayer && activeMetrics
      ? scaleLimit(activeMetrics.unit, activeLayer.placement.rotation, activeMetrics.frame)
      : SCALE_MAX;
  const sizeLabel =
    activeLayer?.kind === "image"
      ? `${printWidthIn.toFixed(1)} in wide`
      : `${Math.round((activeLayer?.placement.scale ?? 0) * 100)}%`;

  const designName = !activeLayer
    ? "None yet"
    : activeLayer.kind === "image"
      ? activeLayer.design.name
      : `“${activeLayer.text}”`;

  const isApparel = shape === "tee" || shape === "hoodie";

  return (
    <div className="editor">
      <div className="editor-preview">
        <div className="editor-context" aria-label="Current selection">
          <div>
            <span>Product</span>
            <strong>{product.name}</strong>
            <small>
              {color}
              {size !== "One size" ? ` · ${size}` : ""}
            </small>
          </div>
          <div>
            <span>Design</span>
            <strong>{designName}</strong>
            <small>{activeLayer ? "On the mockup" : "Add one below"}</small>
          </div>
          <div>
            <span>Placement</span>
            <strong>{activeZone.label}</strong>
            <small>{activeZone.fee > 0 ? `+${formatMoney(activeZone.fee)}` : "Included"}</small>
          </div>
        </div>

        {views.length > 1 && (
          <div className="view-tabs" role="group" aria-label="Product view">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                className="chip"
                aria-pressed={v === view}
                onClick={() => changeView(v)}
              >
                {v === "front" ? "Front" : "Back"}
              </button>
            ))}
          </div>
        )}

        {isApparel && (
          <p className="orientation-note">
            {view === "front"
              ? "Front view. The garment’s left side is on your right."
              : "Back view. The garment’s left side is on your left."}
          </p>
        )}

        <div
          className="editor-stage"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            const file = e.dataTransfer.files[0];
            if (!file) return;
            e.preventDefault();
            void uploadFile(file, activeZone.key);
          }}
          aria-busy={uploading}
        >
          <ProductSilhouette shape={shape} view={view} fill={colorHex} />
          {zones
            .filter((z) => z.view === view)
            .map((z) => (
              <ZoneFrame
                // Remount when the layer's identity changes so measurements are never stale.
                key={`${z.key}:${layerIdentity(layers[z.key])}`}
                zone={z}
                layer={layers[z.key]}
                active={z.key === activeZone.key}
                dark={dark}
                guides={z.key === activeZone.key ? guides : NO_GUIDES}
                stack={stack[z.key] ?? 1}
                emptyAction={emptyActionFor(z)}
                onSelect={() => selectZone(z.key)}
                onChange={(p) => updatePlacement(z.key, p)}
                onGuides={setGuides}
                onMetrics={handleMetrics}
                onRemove={() => setLayer(z.key, undefined)}
                onDropFile={
                  layerKindAllowed(z, "image")
                    ? (file) => {
                        selectZone(z.key);
                        void uploadFile(file, z.key);
                      }
                    : undefined
                }
              />
            ))}
        </div>

        <p className="visually-hidden" role="status" aria-live="polite">
          {uploading ? "Uploading artwork" : ""}
        </p>

        {activeLayer ? (
          <>
            <div className="stage-toolbar">
              <div className="stage-readout">
                {activeLayer.kind === "image" && lowDpi !== null ? (
                  <p className={lowDpi < MIN_DPI ? "warn" : "hint"}>
                    {lowDpi < MIN_DPI
                      ? `Low resolution: about ${Math.round(lowDpi)} DPI at ${printWidthIn.toFixed(1)} in wide. It may print blurry.`
                      : `Prints about ${printWidthIn.toFixed(1)} in wide at ${Math.round(lowDpi)} DPI.`}
                  </p>
                ) : (
                  <p className="hint">{activeZone.label}</p>
                )}
                <p className="hint">Designs stay inside the print area, so nothing gets cut off.</p>
              </div>
              <div className="art-actions">
                {activeLayer.kind === "image" && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      updatePlacement(activeZone.key, fitPlacement(activeZone, activeLayer.aspect))
                    }
                  >
                    Fit to area
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setLayer(activeZone.key, undefined)}
                >
                  Remove
                </button>
              </div>
            </div>

            <PlacementControls
              label={activeZone.label}
              placement={activeLayer.placement}
              maxScale={activeLimit}
              sizeLabel={sizeLabel}
              onChange={(patch) => updatePlacement(activeZone.key, patch)}
              onCenter={() => updatePlacement(activeZone.key, { x: 0.5, y: 0.5 })}
            />
          </>
        ) : (
          <p className="stage-hint">
            {activeZone.kind === "TEXT"
              ? "Type your initials in the panel. A monogram prints on the left chest only."
              : "Click the highlighted print area, then upload or drop an image on it."}
          </p>
        )}

        <p className="stage-hint">
          Drag to move, drag a corner to resize and the round handle to rotate. Arrow keys nudge,
          Shift snaps rotation to 15°, Alt turns snapping off, Ctrl + scroll resizes, Delete
          removes. The controls below do the same without dragging.
        </p>
      </div>

      <div className="editor-panel">
        <div>
          <h1 className="editor-title">{product.name}</h1>
          <p className="editor-price">{formatMoney(unitPrice)}</p>
          <p className="editor-desc">{product.description}</p>
        </div>

        <div className="control-group">
          <span className="control-label">
            Color <span>{color}</span>
          </span>
          <div className="swatches" role="group" aria-label="Color">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                className="swatch"
                style={{ backgroundColor: c.hex }}
                aria-label={c.name}
                aria-pressed={c.name === color}
                onClick={() => changeColor(c.name)}
              />
            ))}
          </div>
        </div>

        {sizes.length > 1 && (
          <div className="control-group">
            <span className="control-label">
              Size <span>{size}</span>
            </span>
            <div className="chips" role="group" aria-label="Size">
              {sizes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="chip"
                  aria-pressed={v.size === size}
                  disabled={!v.available}
                  onClick={() => setSize(v.size)}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="control-group">
          <span className="control-label">Print areas</span>
          <div className="zone-list" role="group" aria-label="Print areas">
            {zones.map((z) => (
              <button
                key={z.key}
                type="button"
                className={layers[z.key] ? "zone-chip has-art" : "zone-chip"}
                aria-pressed={z.key === activeZone.key}
                onClick={() => selectZone(z.key)}
              >
                <span>{z.label}</span>
                <span className="zone-fee">
                  {z.kind === "TEXT" ? "Text · " : ""}
                  {z.fee > 0 ? `+${formatMoney(z.fee)}` : "Included"}
                </span>
              </button>
            ))}
          </div>
          <p className="hint">{placementNote(activeZone)}</p>
        </div>

        <div className="control-group">
          <span className="control-label">
            {activeZone.label} <span>{activeZone.kind === "TEXT" ? "Text" : "Artwork"}</span>
          </span>

          {activeZone.kind === "IMAGE" &&
            (loggedIn ? (
              <div className="upload-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={uploading}
                  onClick={() => openPicker(activeZone.key)}
                >
                  {uploading
                    ? "Uploading..."
                    : activeLayer
                      ? "Replace artwork"
                      : "Upload artwork"}
                </button>
                {activeLayer?.kind === "image" && (
                  <span className="upload-name">{activeLayer.design.name}</span>
                )}
              </div>
            ) : (
              <p className="login-note">
                <Link href="/login">Log in</Link> or{" "}
                <Link href="/signup">create an account</Link> to upload your artwork.
              </p>
            ))}

          {activeZone.kind === "TEXT" && (
            <>
              <input
                ref={textRef}
                className="text-input"
                type="text"
                maxLength={TEXT_MAX_LENGTH}
                placeholder="Initials, up to 6 characters"
                aria-label={`${activeZone.label} text`}
                value={activeLayer?.kind === "text" ? activeLayer.text : ""}
                onChange={(e) => setText(e.target.value)}
              />
              {activeLayer?.kind === "text" && (
                <>
                  <div className="chips" role="group" aria-label="Font">
                    {(Object.keys(TEXT_FONTS) as FontKey[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        className="chip"
                        aria-pressed={activeLayer.font === f}
                        onClick={() => patchText({ font: f })}
                      >
                        {TEXT_FONTS[f].label}
                      </button>
                    ))}
                  </div>
                  <div className="swatches" role="group" aria-label="Text color">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="swatch"
                        style={{ backgroundColor: c }}
                        aria-label={`Text color ${c}`}
                        aria-pressed={activeLayer.color === c}
                        onClick={() => patchText({ color: c })}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            disabled={uploading}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        <div className="control-group">
          <span className="control-label">Quantity</span>
          <QtyStepper value={quantity} onChange={(n) => setQuantity(clamp(n, 1, 20))} />
        </div>

        <div className="editor-buy">
          <div className="summary">
            {feeZones.map((z) => (
              <div key={z.key} className="summary-line">
                <span>{z.label} print</span>
                <span>+{formatMoney(z.fee)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Total</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          {cartError && (
            <p className="editor-alert" role="alert">
              {cartError}
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            onClick={addToCart}
            disabled={adding || uploading || !variant?.available}
          >
            {adding ? "Adding..." : cartError ? "Try again" : "Add to cart"}
          </button>

          {added && (
            <p className="added-note" role="status">
              Added to your cart. <Link href="/cart">View cart</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}