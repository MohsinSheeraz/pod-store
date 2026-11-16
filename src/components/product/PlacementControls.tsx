"use client";

import { SCALE_MIN } from "@/lib/placement";
import type { Placement } from "@/components/product/types";

type Props = {
  label: string;
  placement: Placement;
  // Largest scale that still fits inside the print area at the current rotation
  maxScale: number;
  sizeLabel: string;
  onChange: (patch: Partial<Placement>) => void;
  onCenter: () => void;
};

const NUDGE = 0.02;

export default function PlacementControls({
  label,
  placement,
  maxScale,
  sizeLabel,
  onChange,
  onCenter,
}: Props) {
  const max = Math.max(maxScale, SCALE_MIN);

  return (
    <div className="placement-controls" role="group" aria-label={`Position and size for ${label}`}>
      <div className="nudge" role="group" aria-label="Nudge position">
        <button type="button" className="btn btn-ghost btn-sm nudge-up" aria-label="Move up" onClick={() => onChange({ y: placement.y - NUDGE })}>
          ↑
        </button>
        <button type="button" className="btn btn-ghost btn-sm nudge-left" aria-label="Move left" onClick={() => onChange({ x: placement.x - NUDGE })}>
          ←
        </button>
        <button type="button" className="btn btn-ghost btn-sm nudge-center" onClick={onCenter}>
          Center
        </button>
        <button type="button" className="btn btn-ghost btn-sm nudge-right" aria-label="Move right" onClick={() => onChange({ x: placement.x + NUDGE })}>
          →
        </button>
        <button type="button" className="btn btn-ghost btn-sm nudge-down" aria-label="Move down" onClick={() => onChange({ y: placement.y + NUDGE })}>
          ↓
        </button>
      </div>

      <label className="slider">
        <span>
          Size <output>{sizeLabel}</output>
        </span>
        <input
          type="range"
          min={SCALE_MIN}
          max={max}
          step={0.005}
          value={Math.min(placement.scale, max)}
          onChange={(e) => onChange({ scale: Number(e.target.value) })}
        />
      </label>

      <label className="slider">
        <span>
          Rotation <output>{Math.round(placement.rotation)}°</output>
        </span>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={Math.round(placement.rotation)}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}