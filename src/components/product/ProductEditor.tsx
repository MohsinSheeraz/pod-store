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
  DEFAULT_TEXT_STYLE,
  SCALE_MAX,
  SCALE_MIN,
  textLimit,
  type Guides,
} from "@/lib/placement";
import {
  conflictsWith,
  isContained,
  usableZones,
  zoneRole,
  type LayerMetrics,
} from "@/lib/placement-rules";
import ProductSilhouette, { ProductShade, shapeFor } from "@/components/product/ProductSilhouette";
import ZoneFrame, { toRender } from "@/components/product/ZoneFrame";
import TextPanel from "@/components/product/TextPanel";
import DesignPicker from "@/components/product/DesignPicker";
import MockupModal from "@/components/product/MockupModal";
import type { ExportZone } from "@/lib/mockup-export";
import QtyStepper from "@/components/ui/QtyStepper";
import type {
  DesignDTO,
  FontKey,
  Layer,
  Placement,
  ProductDTO,
  TextStyle,
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
    ? "On the wearer’s left chest (your right when you look at the front)."
    : `${zone.widthIn} × ${zone.heightIn} in print area`;
}

// A print area holds up to two layers: a design and a line of text.
type Kind = "image" | "text";
const KINDS: Kind[] = ["image", "text"];
const lk = (zoneKey: string, kind: Kind) => `${zoneKey}:${kind}`;

const VIEW_NOTE: Record<ViewKey, string> = {
  front: "Front · the garment’s left is on your right",
  back: "Back",
  left: "Left side view",
  right: "Right side view",
};

const layerIdentity = (layer: Layer | undefined) =>
  layer ? (layer.kind === "image" ? layer.design.id : "text") : "none";

type Props = {
  product: ProductDTO;
  loggedIn: boolean;
  // Ready-made designs, and the shopper's own earlier uploads
  catalog: DesignDTO[];
  mine: DesignDTO[];
};

export default function ProductEditor({ product, loggedIn, catalog, mine }: Props) {
  // Only offer print areas whose position follows the product's placement rules.
  const zones = useMemo(() => usableZones(product.zones), [product.zones]);

  if (zones.length === 0) {
    return (
      <div className="editor-empty">
        <div className="editor-alert" role="alert">
          <p>This product can’t be customized right now. Please check back soon.</p>
          <Link href="/#products" className="btn btn-ghost btn-sm">
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  return <Customizer product={{ ...product, zones }} loggedIn={loggedIn} catalog={catalog} mine={mine} />;
}

function Customizer({ product, loggedIn, catalog, mine }: Props) {
  const router = useRouter();
  const zones = product.zones;

  const firstVariant = product.variants.find((v) => v.available) ?? product.variants[0];
  const [color, setColor] = useState(firstVariant.color);
  const [size, setSize] = useState(firstVariant.size);
  const [quantity, setQuantity] = useState(1);

  const [layers, setLayers] = useState<Record<string, Layer>>({});
  const [metricsMap, setMetricsMap] = useState<Record<string, LayerMetrics>>({});
  const [activeKey, setActiveKey] = useState(zones[0].key);
  const [activeKind, setActiveKind] = useState<Kind>("image");
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<ViewKey>(zones[0].view);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const [uploading, setUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState("");
  // Snapshot of every print, taken when the shopper opens "Preview mockups"
  const [mockupPrints, setMockupPrints] = useState<(ExportZone & { view: ViewKey })[] | null>(null);
  const [uploads, setUploads] = useState<DesignDTO[]>(mine);

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
  const activeLayerKey = lk(activeZone.key, activeKind);
  const activeLayer: Layer | undefined = layers[activeLayerKey];
  const layersOf = (zoneKey: string) =>
    KINDS.flatMap((k) => (layers[lk(zoneKey, k)] ? [{ kind: k, layer: layers[lk(zoneKey, k)] }] : []));
  const printed = zones.filter((z) => layersOf(z.key).length > 0);
  const layerCount = Object.keys(layers).length;
  const feeZones = printed.filter((z) => z.fee > 0);

  const unitPrice =
    product.basePrice +
    (variant?.priceDelta ?? 0) +
    feeZones.reduce((sum, z) => sum + z.fee, 0);
  const total = unitPrice * quantity;

  function selectZone(key: string, kind?: Kind) {
    const z = zones.find((zone) => zone.key === key);
    if (!z) return;
    setActiveKey(key);
    setView(z.view);
    setGuides(NO_GUIDES);
    if (kind) setActiveKind(kind);
    else if (!layers[lk(key, activeKind)]) {
      const existing = KINDS.find((k) => layers[lk(key, k)]);
      if (existing) setActiveKind(existing);
    }
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
      // Designs are sized freely (bigger than the area or tiny); only the centre stays in the area.
      const merged = { ...cur.placement, ...patch };
      const placement = {
        ...merged,
        x: clamp(merged.x, 0, 1),
        y: clamp(merged.y, 0, 1),
        scale: clamp(merged.scale, SCALE_MIN, SCALE_MAX),
      };
      return { ...prev, [key]: { ...cur, placement } };
    });
    setAdded(false);
  }

  // The zone reports what it measured (after text edits, resizes, window changes). Kept so the
  // editor can tell when a print hangs outside its area.
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
  }, []);

  // Front and the left-chest monogram are either-or: starting on one clears the other.
  function dropConflicts(zoneKey: string) {
    const hit = conflictsWith(zoneKey).filter((k) => KINDS.some((kind) => layers[lk(k, kind)]));
    if (hit.length === 0) return;
    setLayers((prev) => {
      const next = { ...prev };
      for (const k of hit) for (const kind of KINDS) delete next[lk(k, kind)];
      return next;
    });
    const names = hit.map((k) => zones.find((z) => z.key === k)?.label ?? k).join(", ");
    const here = zones.find((z) => z.key === zoneKey)?.label ?? "this area";
    toast(`${names} removed. Choose either ${names} or ${here}, not both.`);
  }

  function setText(value: string) {
    const zone = activeZone;
    const key = lk(zone.key, "text");
    if (value.trim() && !layers[key]) dropConflicts(zone.key);
    const text = value.slice(0, textLimit(zone));
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
        const untouched = Math.abs(cur.placement.scale - fitTextScale(zone, cur.text.length)) < 0.001;
        const scale = untouched ? fitTextScale(zone, text.length) : cur.placement.scale;
        return { ...prev, [key]: { ...cur, text, placement: { ...cur.placement, scale } } };
      }
      return {
        ...prev,
        [key]: {
          kind: "text",
          text,
          font: "display",
          color: dark ? "#FFFFFF" : "#14161B",
          style: DEFAULT_TEXT_STYLE,
          placement: { x: 0.5, y: 0.5, scale: fitTextScale(zone, text.length), rotation: 0 },
        },
      };
    });
  }

  function patchText(patch: { font?: FontKey; color?: string; style?: Partial<TextStyle> }) {
    const key = lk(activeZone.key, "text");
    setAdded(false);
    setLayers((prev) => {
      const cur = prev[key];
      if (cur?.kind !== "text") return prev;
      return {
        ...prev,
        [key]: {
          ...cur,
          font: patch.font ?? cur.font,
          color: patch.color ?? cur.color,
          style: { ...cur.style, ...patch.style },
        },
      };
    });
  }

  // Puts a design in a print area, fitted to it. Used for library picks and fresh uploads.
  async function placeDesign(zoneKey: string, design: DesignDTO) {
    const zone = zones.find((z) => z.key === zoneKey);
    if (!zone) return;
    try {
      const dims = await loadImageSize(design.imageUrl);
      dropConflicts(zone.key);
      const aspect = dims.w / dims.h;
      setLayer(lk(zone.key, "image"), {
        kind: "image",
        design,
        aspect,
        // Vector art (SVG) prints sharp at any size
        pixelW: design.imageUrl.endsWith(".svg") ? Infinity : dims.w,
        placement: fitPlacement(zone, aspect),
      });
      selectZone(zone.key, "image");
    } catch {
      toast.error("Could not load that design. Try another one.");
    }
  }

  function pickDesign(design: DesignDTO) {
    void placeDesign(activeZone.key, design);
  }

  async function uploadFile(file: File, zoneKey: string) {
    const zone = zones.find((z) => z.key === zoneKey);
    if (!zone) return;
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
      setUploads((prev) => [design, ...prev.filter((d) => d.id !== design.id)]);
      await placeDesign(zone.key, design);
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
    selectZone(zoneKey, "image");
    fileRef.current?.click();
  }

  function focusText(zoneKey: string) {
    selectZone(zoneKey, "text");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  function emptyActionFor(z: (typeof zones)[number]) {
    return {
      label: "Add design",
      run: () => {
        selectZone(z.key, "image");
        requestAnimationFrame(() =>
          document.querySelector(".picker")?.scrollIntoView({ behavior: "smooth", block: "center" })
        );
      },
    };
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
          prints: printed.flatMap((z) =>
            layersOf(z.key).map(({ layer: l }) =>
              l.kind === "image"
                ? { zoneId: z.id, designId: l.design.id, placement: l.placement }
                : {
                    zoneId: z.id,
                    text: l.text,
                    font: l.font,
                    color: l.color,
                    textStyle: l.style,
                    placement: l.placement,
                  }
            )
          ),
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
    activeLayer?.kind === "image" && Number.isFinite(activeLayer.pixelW)
      ? dpiFor(activeLayer.pixelW, activeLayer.placement.scale, activeZone.widthIn)
      : null;
  const printWidthIn = activeLayer ? activeLayer.placement.scale * activeZone.widthIn : 0;

  const activeMetrics = activeLayer ? metricsMap[activeLayerKey] : undefined;
  const overhang =
    activeLayer && activeMetrics
      ? !isContained(activeLayer.placement, activeMetrics.unit, activeMetrics.frame)
      : false;

  function centerActive() {
    updatePlacement(activeLayerKey, { x: 0.5, y: 0.5 });
  }

  function fitActive() {
    if (!activeLayer) return;
    updatePlacement(
      activeLayerKey,
      activeLayer.kind === "image"
        ? fitPlacement(activeZone, activeLayer.aspect)
        : { x: 0.5, y: 0.5, scale: fitTextScale(activeZone, activeLayer.text.length) }
    );
  }

  function removeActive() {
    setLayer(activeLayerKey, undefined);
  }

  // Opens the mockup gallery: the design on a model, on the plain product, and on sleeves.
  function openMockups() {
    if (printed.length === 0) {
      toast.error("Add a design first.");
      return;
    }
    setMockupPrints(
      zones.flatMap((z) =>
        layersOf(z.key).map(({ layer: l }) => ({
          key: z.key,
          view: z.view,
          x: z.x,
          y: z.y,
          w: z.w,
          h: z.h,
          layer: toRender(l),
        }))
      )
    );
  }

  function clearAll() {
    setLayers({});
    setMetricsMap({});
    setAdded(false);
  }

  const isApparel = shape === "tee" || shape === "hoodie";

  return (
    <div className={collapsed ? "editor-shell is-collapsed" : "editor-shell"}>
      <aside className="editor-sidebar" id="editor-sidebar" aria-label="Customize product" aria-hidden={collapsed}>
        <div className="sidebar-head">
          <Link href="/#products" className="back-link">
            ← Products
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            aria-expanded={!collapsed}
            aria-controls="editor-sidebar"
            title="Hide panel"
            onClick={() => setCollapsed(true)}
          >
            ‹
          </button>
        </div>

        <div className="sidebar-body editor-panel">
        <div className="panel-head">
          <h1 className="editor-title">{product.name}</h1>
          <p className="editor-price">{formatMoney(unitPrice)}</p>
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
          <span className="control-label">
            <b className="step">1</b> Print area{" "}
            <span>
              {printed.length} of {zones.length} used
            </span>
          </span>
          <div className="area-grid" role="group" aria-label="Print areas">
            {zones.map((z) => (
              <button
                key={z.key}
                type="button"
                className={layersOf(z.key).length > 0 ? "area-card has-art" : "area-card"}
                aria-pressed={z.key === activeZone.key}
                onClick={() => selectZone(z.key)}
              >
                <span className="area-name">{z.label}</span>
                <span className="zone-fee">
                  {layersOf(z.key).length > 0
                    ? "✓ Added"
                    : conflictsWith(z.key).some((k) => layersOf(k).length > 0)
                      ? `Replaces ${zones.find((o) => o.key === conflictsWith(z.key).find((k) => layersOf(k).length > 0))?.label ?? "other"}`
                    : z.view === "left" || z.view === "right"
                      ? "Side view"
                      : z.view === "back"
                        ? "Back view"
                        : "Front view"}
                  {" · "}
                  {z.fee > 0 ? `+${formatMoney(z.fee)}` : "Included"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">
            <b className="step">2</b> Design <span>{activeZone.label}</span>
          </span>
          <p className="hint">{placementNote(activeZone)}</p>

          <div className="seg" role="group" aria-label="Add to this print area">
            <button
              type="button"
              aria-pressed={activeKind === "image"}
              onClick={() => selectZone(activeZone.key, "image")}
            >
              Design{layers[lk(activeZone.key, "image")] && <i className="seg-dot" />}
            </button>
            <button
              type="button"
              aria-pressed={activeKind === "text"}
              onClick={() => focusText(activeZone.key)}
            >
              {activeZone.kind === "TEXT" ? "Initials" : "Text"}
              {layers[lk(activeZone.key, "text")] && <i className="seg-dot" />}
            </button>
          </div>

          {activeKind === "image" && (
            <DesignPicker
              catalog={catalog}
              mine={uploads}
              selectedId={activeLayer?.kind === "image" ? activeLayer.design.id : null}
              loggedIn={loggedIn}
              uploading={uploading}
              onPick={pickDesign}
              onUpload={() => openPicker(activeZone.key)}
            />
          )}

          {activeKind === "text" && (
            <TextPanel
              zone={activeZone}
              layer={activeLayer?.kind === "text" ? activeLayer : undefined}
              inputRef={textRef}
              onText={setText}
              onPatch={patchText}
            />
          )}

          {activeLayer && (
            <button type="button" className="btn btn-danger btn-sm remove-design" onClick={removeActive}>
              Remove {activeLayer.kind === "text" ? "text" : "design"} from {activeZone.label}
            </button>
          )}
          {layerCount > 1 && (
            <button type="button" className="link-btn" onClick={clearAll}>
              Clear all designs
            </button>
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

        </div>

        <div className="sidebar-foot editor-buy">
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

          <div className="foot-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={addToCart}
              disabled={adding || uploading || !variant?.available}
            >
              {adding ? "Adding..." : cartError ? "Try again" : "Add to cart"}
            </button>
            {printed.length > 0 && (
              <button type="button" className="btn btn-ghost btn-lg" onClick={openMockups}>
                Preview
              </button>
            )}
          </div>

          {added && (
            <p className="added-note" role="status">
              Added to your cart. <Link href="/cart">View cart</Link>
            </p>
          )}
        </div>
      </aside>

      <section className="editor-canvas" aria-label="Product preview">
        <div className="canvas-bar">
          {collapsed && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              aria-expanded={false}
              aria-controls="editor-sidebar"
              onClick={() => setCollapsed(false)}
            >
              ☰ Customize
            </button>
          )}
          <p className="canvas-note">{isApparel ? VIEW_NOTE[view] : activeZone.label}</p>

          {activeLayer ? (
            <>
              <p className={lowDpi !== null && lowDpi < MIN_DPI ? "canvas-info warn" : "canvas-info"} role="status">
                {overhang
                  ? "Parts outside the dashed area won't be printed. "
                  : ""}
                {activeLayer.kind === "image"
                  ? lowDpi !== null
                    ? lowDpi < MIN_DPI
                      ? `Low resolution: ~${Math.round(lowDpi)} DPI at ${printWidthIn.toFixed(1)} in wide. May print blurry.`
                      : `${printWidthIn.toFixed(1)} in wide · ${Math.round(lowDpi)} DPI`
                    : `Vector art · ${printWidthIn.toFixed(1)} in wide, prints sharp`
                  : `Text on ${activeZone.label}`}
              </p>
              <div className="art-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={centerActive}>
                  Center
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={fitActive}>
                  Fit
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={removeActive}>
                  Remove {activeLayer.kind === "text" ? "text" : "design"}
                </button>
              </div>
            </>
          ) : (
            <p className="canvas-info">
              {activeKind === "text"
                ? "Type your text in the panel. It lands on the highlighted print area."
                : "Pick a ready-made design or upload your own. It lands on the highlighted print area."}
            </p>
          )}
        </div>

        <div className="stage-wrap">
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
            .flatMap((z) => {
              const present = layersOf(z.key);
              // An empty area still gets one frame; otherwise one frame per layer.
              const entries: { kind: Kind; layer: Layer | undefined }[] =
                present.length > 0 ? present : [{ kind: activeKind, layer: undefined }];
              return entries.map((e, i) => {
                const key = lk(z.key, e.kind);
                const zoneActive = z.key === activeZone.key;
                return (
                  <ZoneFrame
                    // Remount when the layer's identity changes so measurements are never stale.
                    key={`${key}:${layerIdentity(e.layer)}`}
                    zone={z}
                    layer={e.layer}
                    layerKey={key}
                    active={zoneActive}
                    selected={zoneActive && e.kind === activeKind}
                    bare={i > 0}
                    dark={dark}
                    guides={zoneActive && e.kind === activeKind ? guides : NO_GUIDES}
                    stack={stack[z.key] ?? 1}
                    emptyAction={emptyActionFor(z)}
                    onSelect={() => selectZone(z.key, e.kind)}
                    onChange={(p) => updatePlacement(key, p)}
                    onGuides={setGuides}
                    onMetrics={handleMetrics}
                    onRemove={() => setLayer(key, undefined)}
                    onDropFile={
                      i === 0
                        ? (file) => {
                            selectZone(z.key, "image");
                            void uploadFile(file, z.key);
                          }
                        : undefined
                    }
                  />
                );
              });
            })}
          <ProductShade shape={shape} view={view} />
        </div>

        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {uploading ? "Uploading artwork" : ""}
        </p>
      </section>

      {mockupPrints && (
        <MockupModal
          shape={shape}
          fill={colorHex}
          name={`${product.name} ${color}`}
          prints={mockupPrints}
          onClose={() => setMockupPrints(null)}
        />
      )}
    </div>
  );
}