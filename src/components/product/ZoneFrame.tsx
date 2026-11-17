"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LayerOverlay from "@/components/product/LayerOverlay";
import LayerView, { type LayerRender } from "@/components/product/LayerView";
import type { Guides } from "@/lib/placement";
import { zoneRole, type LayerMetrics } from "@/lib/placement-rules";
import type { Layer, Placement, ZoneDTO } from "@/components/product/types";

type Props = {
  zone: ZoneDTO;
  layer: Layer | undefined;
  // Key of this layer in the editor ("front:image"), used for measurements
  layerKey: string;
  // The print area is the one being edited
  active: boolean;
  // This layer (not just its area) is the selected one
  selected: boolean;
  // A second layer in the same area: draws no frame, label or empty state of its own
  bare?: boolean;
  dark: boolean;
  guides: Guides;
  // CSS stacking order: smaller print areas sit above larger ones that overlap them
  stack: number;
  // Shown on the empty canvas, e.g. "Upload" or "Add text"
  emptyAction?: { label: string; run: () => void };
  onSelect: () => void;
  onChange: (p: Placement) => void;
  onGuides: (g: Guides) => void;
  // Measured layer + print area sizes, so the editor can keep the layer inside the zone.
  // The editor remounts this component when the layer's identity changes, so metrics
  // are never stale.
  onMetrics: (key: string, m: LayerMetrics) => void;
  onRemove: () => void;
  onDropFile?: (file: File) => void;
};

function toRender(layer: Layer): LayerRender {
  return layer.kind === "image"
    ? { kind: "image", imageUrl: layer.design.imageUrl, placement: layer.placement }
    : layer;
}

export { toRender };

export default function ZoneFrame({
  zone,
  layer,
  layerKey,
  active,
  selected,
  bare = false,
  dark,
  guides,
  stack,
  emptyAction,
  onSelect,
  onChange,
  onGuides,
  onMetrics,
  onRemove,
  onDropFile,
}: Props) {
  const clipRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLElement | null>(null);
  const scaleRef = useRef(1);
  const [dropping, setDropping] = useState(false);
  const [metrics, setMetrics] = useState({
    box: { w: 0, h: 0 },
    frame: { w: 1, h: 1 },
    unit: { w: 0, h: 0 },
  });

  const layerId = layer ? (layer.kind === "image" ? layer.design.id : "text") : null;

  // The scale the layer is drawn at right now, so measured sizes can be turned into
  // "size at scale 1".
  useLayoutEffect(() => {
    scaleRef.current = layer?.placement.scale ?? 1;
  });

  // Measure the layer and the zone so the selection box can match the artwork.
  useEffect(() => {
    const frame = clipRef.current;
    const el = layerRef.current;
    if (!frame || !el) return;

    const measure = () => {
      const fw = frame.clientWidth || 1;
      const fh = frame.clientHeight || 1;
      const s = scaleRef.current || 1;
      setMetrics({
        box: { w: (el.offsetWidth / fw) * 100, h: (el.offsetHeight / fh) * 100 },
        frame: { w: fw, h: fh },
        unit: { w: el.offsetWidth / s, h: el.offsetHeight / s },
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layerId]);

  useEffect(() => {
    if (metrics.unit.w > 0 || metrics.unit.h > 0) {
      onMetrics(layerKey, { unit: metrics.unit, frame: metrics.frame });
    }
  }, [metrics, layerKey, onMetrics]);

  const className = [
    "zone-frame",
    active && "is-active",
    dark && "is-dark",
    dropping && "is-drop",
    layer && "has-layer",
    bare && "is-bare",
  ]
    .filter(Boolean)
    .join(" ");

  const render = layer ? toRender(layer) : null;

  const cx = zone.x + zone.w / 2;
  const tagClass = [
    "zone-tag",
    zone.y < 12 && "is-below",
    cx > 70 && "is-end",
    cx < 30 && "is-start",
  ]
    .filter(Boolean)
    .join(" ");
  const tag =
    zoneRole(zone) === "left-chest" ? `${zone.label} · wearer’s left` : zone.label;

  function isFileDrag(e: React.DragEvent) {
    return !!onDropFile && e.dataTransfer.types.includes("Files");
  }

  return (
    <div
      className={className}
      data-zone={zone.key}
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.w}%`,
        height: `${zone.h}%`,
        zIndex: stack,
      }}
      onPointerDown={active || bare ? undefined : onSelect}
      onDragEnter={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropping(true);
      }}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropping(false);
        const file = e.dataTransfer.files[0];
        if (file) onDropFile?.(file);
      }}
    >
      {!bare && (
        <span className={tagClass} aria-hidden="true">
          {tag}
        </span>
      )}

      {/* A faded, unclipped copy: shows what hangs outside the print area (it won't print). */}
      {render && render.kind === "image" && (
        <div className="zone-ghost" aria-hidden="true">
          <LayerView layer={render} />
        </div>
      )}

      <div ref={clipRef} className="zone-clip">
        {!render && (
          <span className="zone-empty">
            <span>{zone.label}</span>
            {active && emptyAction && (
              <button type="button" className="zone-action" onClick={emptyAction.run}>
                {emptyAction.label}
              </button>
            )}
          </span>
        )}
        {render && (
          <LayerView
            layer={render}
            innerRef={(el) => {
              layerRef.current = el;
            }}
          />
        )}
      </div>

      {layer && (
        <LayerOverlay
          placement={layer.placement}
          box={metrics.box}
          frameRef={clipRef}
          label={zone.label}
          selected={selected}
          widthIn={layer.kind === "image" ? zone.widthIn : null}
          onSelect={onSelect}
          onChange={onChange}
          onGuides={onGuides}
          onRemove={onRemove}
        />
      )}

      {selected && guides.x !== null && (
        <span className="guide guide-v" style={{ left: `${guides.x * 100}%` }} />
      )}
      {selected && guides.y !== null && (
        <span className="guide guide-h" style={{ top: `${guides.y * 100}%` }} />
      )}
    </div>
  );
}