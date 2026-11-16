"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  clamp,
  extents,
  snapAxis,
  SCALE_MAX,
  SCALE_MIN,
  type Guides,
} from "@/lib/placement";
import type { Placement } from "@/components/product/types";

type Gesture =
  | {
      type: "move";
      startX: number;
      startY: number;
      px: number;
      py: number;
      rect: DOMRect;
    }
  | {
      type: "resize";
      startScale: number;
      startDist: number;
      cx: number;
      cy: number;
    };

const SNAP = 0.025;
const CORNERS = ["nw", "ne", "sw", "se"] as const;

type Props = {
  placement: Placement;
  box: { w: number; h: number };
  frameRef: RefObject<HTMLDivElement | null>;
  label: string;
  selected: boolean;
  // Real printed width of the zone in inches, or null when scale isn't a width (text)
  widthIn: number | null;
  onSelect: () => void;
  onChange: (p: Placement) => void;
  onGuides: (g: Guides) => void;
  onRemove: () => void;
};

export default function LayerOverlay({
  placement,
  box,
  frameRef,
  label,
  selected,
  widthIn,
  onSelect,
  onChange,
  onGuides,
  onRemove,
}: Props) {
  const gesture = useRef<Gesture | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ placement, onChange });
  // The readout is derived from the placement the editor actually kept, so it stays
  // correct when a resize is capped at the print area's edge.
  const [resizing, setResizing] = useState(false);
  const hud = resizing
    ? widthIn
      ? `${(placement.scale * widthIn).toFixed(1)} in wide`
      : `${Math.round(placement.scale * 100)}%`
    : null;

  useEffect(() => {
    latest.current = { placement, onChange };
  });

  // Ctrl/Cmd + wheel (also trackpad pinch) scales the layer. Plain scrolling still
  // scrolls the page. Needs a non-passive listener to cancel browser zoom.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { placement: p, onChange: change } = latest.current;
      change({
        ...p,
        scale: clamp(
          p.scale * Math.exp(-e.deltaY * 0.0015),
          SCALE_MIN,
          SCALE_MAX,
        ),
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function begin(e: React.PointerEvent<HTMLElement>, g: Gesture) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    bodyRef.current?.focus({ preventScroll: true });
    gesture.current = g;
  }

  function center() {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      rect,
      cx: rect.left + placement.x * rect.width,
      cy: rect.top + placement.y * rect.height,
    };
  }

  // Pressing any layer selects it and starts dragging in the same gesture.
  function startMove(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (!selected) onSelect();
    begin(e, {
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      px: placement.x,
      py: placement.y,
      rect,
    });
  }

  function startResize(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;
    const c = center();
    if (!c) return;
    begin(e, {
      type: "resize",
      startScale: placement.scale,
      startDist: Math.max(1, Math.hypot(e.clientX - c.cx, e.clientY - c.cy)),
      cx: c.cx,
      cy: c.cy,
    });
  }

  function onMove(e: React.PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    const { placement: p, onChange: change } = latest.current;

    if (g.type === "move") {
      let x = g.px + (e.clientX - g.startX) / g.rect.width;
      let y = g.py + (e.clientY - g.startY) / g.rect.height;
      let guideX: number | null = null;
      let guideY: number | null = null;

      // Hold Alt to move freely without snapping
      if (!e.altKey) {
        const { ex, ey } = extents({ ...p, x, y }, box, {
          w: g.rect.width,
          h: g.rect.height,
        });
        const sx = snapAxis(x, ex, SNAP);
        const sy = snapAxis(y, ey, SNAP);
        x = sx.value;
        y = sy.value;
        guideX = sx.guide;
        guideY = sy.guide;
      }

      change({ ...p, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
      onGuides({ x: guideX, y: guideY });
    }

    if (g.type === "resize") {
      const dist = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      const scale = clamp(
        (g.startScale * dist) / g.startDist,
        SCALE_MIN,
        SCALE_MAX,
      );
      change({ ...p, scale });
      setResizing(true);
    }
  }

  function end() {
    if (!gesture.current) return;
    gesture.current = null;
    setResizing(false);
    onGuides({ x: null, y: null });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove();
      return;
    }
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChange({
      ...placement,
      x: clamp(placement.x + move[0], 0, 1),
      y: clamp(placement.y + move[1], 0, 1),
    });
  }

  return (
    <div className="overlay">
      <div
        ref={bodyRef}
        className={selected ? "overlay-box is-selected" : "overlay-box"}
        role="group"
        tabIndex={selected ? 0 : -1}
        aria-label={`${label}. Drag to move. Arrow keys nudge it, Delete removes it.`}
        style={{
          left: `${placement.x * 100}%`,
          top: `${placement.y * 100}%`,
          width: `${box.w}%`,
          height: `${box.h}%`,
          transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
        }}
        onPointerDown={startMove}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKeyDown}
      >
        {selected && (
          <>
            <button
              type="button"
              className="layer-remove"
              aria-label={`Remove design from ${label}`}
              title="Remove design"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              ×
            </button>
            {CORNERS.map((c) => (
              <span
                key={c}
                className={`handle handle-${c}`}
                title="Drag to resize"
                aria-hidden="true"
                onPointerDown={startResize}
              />
            ))}
          </>
        )}
      </div>
      {hud && <span className="overlay-hud">{hud}</span>}
    </div>
  );
}