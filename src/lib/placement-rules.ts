import { SCALE_MAX, SCALE_MIN, STAGE_H, STAGE_W, TEXT_BASE_CQW } from "@/lib/placement";
import type { Placement } from "@/components/product/types";

// Product-specific placement rules. Pure functions only (no React, no Prisma), so the
// editor, the cart API and the tests all enforce exactly the same thing.
//
// Orientation: "left" always means the WEARER'S left. In the front view the wearer faces
// the shopper, so the wearer's left is on the RIGHT-hand side of the mockup. In the back
// view it is on the left-hand side.

export type ZoneLike = {
  key: string;
  label: string;
  view: string;
  kind: "IMAGE" | "TEXT";
  // percent of the 400 x 420 mockup
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Size = { w: number; h: number };
export type LayerKind = "image" | "text";
// unit = layer size in px at scale 1, frame = print area size in px (same px space)
export type LayerMetrics = { unit: Size; frame: Size };
export type ZoneRole = "left-chest" | "left" | "right" | "free";

export const CENTER_LINE = 50;
// A left-chest print sits on the upper chest: its bottom edge may not pass this line.
export const LEFT_CHEST_MAX_BOTTOM = 55;
// How far a layer may poke past the print area before we call it outside (fraction of zone).
export const CONTAIN_TOLERANCE = 0.004;
// The API only has estimates of text width, so it is more forgiving than the editor.
export const SERVER_TOLERANCE = 0.02;
// Narrowest plausible glyph width (em) used for the API's lower-bound text width.
export const TEXT_MIN_EM = 0.3;

/** Monograms (text zones) and the "left-chest" key are left-chest prints. */
export function zoneRole(zone: Pick<ZoneLike, "key" | "kind">): ZoneRole {
  if (zone.kind === "TEXT" || zone.key === "left-chest") return "left-chest";
  if (zone.key.startsWith("left-")) return "left";
  if (zone.key.startsWith("right-")) return "right";
  return "free";
}

/** Why this zone's position on the mockup breaks its rule, or null when it is fine. */
export function zoneProblem(zone: ZoneLike): string | null {
  const { x, y, w, h } = zone;
  const nums = [x, y, w, h];
  if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    return `${zone.label} has an invalid position.`;
  }
  if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > 100 || y + h > 100) {
    return `${zone.label} sits outside the product mockup.`;
  }

  const role = zoneRole(zone);

  if (role === "left-chest") {
    if (zone.view !== "front") {
      return `${zone.label} must be on the front view.`;
    }
    // Entirely on the wearer's left = the right-hand half of the front view. A zone that
    // touches or crosses the center line is a center print, which is never allowed.
    if (x < CENTER_LINE) {
      return `${zone.label} must sit on the wearer's left chest, not the center.`;
    }
    if (y + h > LEFT_CHEST_MAX_BOTTOM) {
      return `${zone.label} must sit on the upper chest.`;
    }
    return null;
  }

  if (role === "left" || role === "right") {
    // Side profiles are named for the wearer's side: the "left" view shows the left sleeve.
    if (zone.view === "left" || zone.view === "right") {
      return zone.view === role ? null : `${zone.label} is on the wrong side of the ${zone.view} view.`;
    }
    const cx = x + w / 2;
    const wearerLeftIsScreenRight = zone.view !== "back";
    const wantsScreenRight = (role === "left") === wearerLeftIsScreenRight;
    const ok = wantsScreenRight ? cx > CENTER_LINE : cx < CENTER_LINE;
    if (!ok) return `${zone.label} is on the wrong side of the ${zone.view} view.`;
  }

  return null;
}

export const usableZones = <T extends ZoneLike>(zones: T[]): T[] =>
  zones.filter((z) => zoneProblem(z) === null);

/** Every print area takes artwork and text; monograms just have a shorter text limit. */
export const layerKindAllowed = (_zone: Pick<ZoneLike, "kind">, kind: LayerKind) =>
  kind === "image" || kind === "text";

export const zoneFrame = (zone: Pick<ZoneLike, "w" | "h">): Size => ({
  w: (zone.w / 100) * STAGE_W,
  h: (zone.h / 100) * STAGE_H,
});

// Half-size of the rotated layer as a fraction of the zone, per axis.
export function halfExtents(unit: Size, scale: number, rotation: number, frame: Size) {
  const pw = unit.w * scale;
  const ph = unit.h * scale;
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    ex: (pw * c + ph * s) / 2 / frame.w,
    ey: (pw * s + ph * c) / 2 / frame.h,
  };
}

/** Largest scale at which the layer still fits inside the zone at this rotation. */
export function scaleLimit(unit: Size, rotation: number, frame: Size) {
  const { ex, ey } = halfExtents(unit, 1, rotation, frame);
  const lim = Math.min(ex > 0 ? 0.5 / ex : Infinity, ey > 0 ? 0.5 / ey : Infinity);
  return Math.min(SCALE_MAX, lim);
}

/** True when the whole layer, rotation included, is inside the zone (within tolerance). */
export function isContained(
  p: Placement,
  unit: Size,
  frame: Size,
  tol = CONTAIN_TOLERANCE
) {
  const { ex, ey } = halfExtents(unit, p.scale, p.rotation, frame);
  return (
    p.x - ex >= -tol && p.x + ex <= 1 + tol && p.y - ey >= -tol && p.y + ey <= 1 + tol
  );
}

const clampCenter = (v: number, half: number) =>
  half >= 0.5 ? 0.5 : Math.min(1 - half, Math.max(half, v));

/**
 * Forces a placement into the zone: shrinks it if it cannot fit at this rotation, then
 * pushes the center in so no part sticks out. Returns the same object when nothing changes.
 */
export function constrainPlacement(p: Placement, unit: Size, frame: Size): Placement {
  if (unit.w <= 0 && unit.h <= 0) return p; // not measured yet
  if (isContained(p, unit, frame)) return p;

  const scale = Math.min(Math.max(p.scale, SCALE_MIN), scaleLimit(unit, p.rotation, frame));
  const { ex, ey } = halfExtents(unit, scale, p.rotation, frame);
  return {
    x: clampCenter(p.x, ex),
    y: clampCenter(p.y, ey),
    scale,
    rotation: p.rotation,
  };
}

// ---- API-side validation ---------------------------------------------------------------

export type LayerSpec =
  | { kind: "image"; aspect: number | null } // width / height of the file, null if unknown
  | { kind: "text"; chars: number };

/** Layer size at scale 1, in the same px space as zoneFrame(). Text width is a lower bound. */
export function estimateUnitBox(zone: Pick<ZoneLike, "w" | "h">, spec: LayerSpec): Size {
  const frame = zoneFrame(zone);
  if (spec.kind === "image") {
    const ok = spec.aspect !== null && Number.isFinite(spec.aspect) && spec.aspect > 0;
    return { w: frame.w, h: ok ? frame.w / (spec.aspect as number) : 0 };
  }
  const fontPx = (TEXT_BASE_CQW / 100) * frame.w;
  return { w: Math.max(1, spec.chars) * TEXT_MIN_EM * fontPx, h: fontPx };
}

/** The error message for an invalid print, or null when the print may be saved. */
export function validatePlacement(
  zone: ZoneLike,
  spec: LayerSpec,
  p: Placement,
  tol = SERVER_TOLERANCE
): string | null {
  const problem = zoneProblem(zone);
  if (problem) return problem;

  if (!layerKindAllowed(zone, spec.kind)) {
    return `${zone.label} does not take this kind of print.`;
  }

  // A print may be bigger than its area or hang over the edge: only what is inside the print
  // area is printed. So there is no containment check, just sane numbers.
  const nums = [p.x, p.y, p.scale, p.rotation];
  if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    return `${zone.label}: the placement is invalid.`;
  }
  if (p.scale < SCALE_MIN || p.scale > SCALE_MAX || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
    return `${zone.label}: the placement is out of range.`;
  }
  void tol;
  return null;
}
// ---- Areas that exclude each other ------------------------------------------------------------

// The left-chest monogram sits on top of the front area, so a design goes either front centre or
// on the monogram, never both.
export const EXCLUSIVE_AREAS: string[][] = [["front", "monogram"]];

/** The other areas that can't be used together with this one. */
export const conflictsWith = (key: string): string[] =>
  EXCLUSIVE_AREAS.flatMap((group) => (group.includes(key) ? group.filter((k) => k !== key) : []));

/** An error message when the used print areas break an either-or rule, otherwise null. */
export function exclusiveConflict(used: { key: string; label: string }[]): string | null {
  for (const group of EXCLUSIVE_AREAS) {
    const hit = used.filter((u) => group.includes(u.key));
    if (hit.length > 1) return `Choose either ${hit.map((h) => h.label).join(" or ")}, not both.`;
  }
  return null;
}
