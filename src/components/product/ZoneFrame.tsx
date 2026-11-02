"use client";

import { useEffect, useRef, useState } from "react";
import LayerOverlay from "@/components/product/LayerOverlay";
import LayerView, { type LayerRender } from "@/components/product/LayerView";
import { extents, type Guides } from "@/lib/placement";
import type { Layer, Placement, ZoneDTO } from "@/components/product/types";

type Props = {
  zone: ZoneDTO;
  layer: Layer | undefined;
  active: boolean;
  dark: boolean;
  guides: Guides;
  // Shown on the empty canvas, e.g. "Upload" or "Add text"
  emptyAction?: { label: string; run: () => void };
  onSelect: () => void;
  onChange: (p: Placement) => void;
  onGuides: (g: Guides) => void;
  onOutside: (outside: boolean) => void;
  onRemove: () => void;
  onDropFile?: (file: File) => void;
};

function toRender(layer: Layer): LayerRender {
  return layer.kind === "image"
    ? { kind: "image", imageUrl: layer.design.imageUrl, placement: layer.placement }
    : layer;
}

export default function ZoneFrame({
  zone,
  layer,
  active,
  dark,
  guides,
  emptyAction,
  onSelect,
  onChange,
  onGuides,
  onOutside,
  onRemove,
  onDropFile,
}: Props) {
  const clipRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLElement | null>(null);
  const [dropping, setDropping] = useState(false);
  const [metrics, setMetrics] = useState({
    box: { w: 0, h: 0 },
    frame: { w: 1, h: 1 },
  });

  const layerId = layer ? (layer.kind === "image" ? layer.design.id : "text") : null;

  // Measure the layer and the zone so the selection box can match the artwork.
  useEffect(() => {
    const frame = clipRef.current;
    const el = layerRef.current;
    if (!frame || !el) return;

    const measure = () => {
      const fw = frame.clientWidth || 1;
      const fh = frame.clientHeight || 1;
      setMetrics({
        box: { w: (el.offsetWidth / fw) * 100, h: (el.offsetHeight / fh) * 100 },
        frame: { w: fw, h: fh },
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layerId]);

  let outside = false;
  if (layer) {
    const { ex, ey } = extents(layer.placement, metrics.box, metrics.frame);
    const p = layer.placement;
    const tol = 0.004;
    outside = p.x - ex < -tol || p.x + ex > 1 + tol || p.y - ey < -tol || p.y + ey > 1 + tol;
  }

  useEffect(() => {
    if (active) onOutside(outside);
  }, [active, outside, onOutside]);

  const className = [
    "zone-frame",
    active && "is-active",
    dark && "is-dark",
    dropping && "is-drop",
    layer && "has-layer",
  ]
    .filter(Boolean)
    .join(" ");

  const render = layer ? toRender(layer) : null;

  function isFileDrag(e: React.DragEvent) {
    return !!onDropFile && e.dataTransfer.types.includes("Files");
  }

  return (
    <div
      className={className}
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.w}%`,
        height: `${zone.h}%`,
      }}
      onPointerDown={active ? undefined : onSelect}
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
      {/* What sticks out of the print area, faded, so you can see what gets cut off */}
      {active && render && (
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
          selected={active}
          widthIn={layer.kind === "image" ? zone.widthIn : null}
          onSelect={onSelect}
          onChange={onChange}
          onGuides={onGuides}
          onRemove={onRemove}
        />
      )}

      {active && guides.x !== null && (
        <span className="guide guide-v" style={{ left: `${guides.x * 100}%` }} />
      )}
      {active && guides.y !== null && (
        <span className="guide guide-h" style={{ top: `${guides.y * 100}%` }} />
      )}
    </div>
  );
}
