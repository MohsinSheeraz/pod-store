import type { FontKey, Placement, TextStyle } from "@/components/product/types";

export const STAGE_W = 400;
export const STAGE_H = 420;
export const SCALE_MIN = 0.05;
// A design can be sized freely: much bigger than its print area (it is clipped when printed)
// or tiny.
export const SCALE_MAX = 8;
export const MIN_DPI = 150;
// Monograms are initials; text on any other print area can be a short phrase.
export const TEXT_MAX_LENGTH = 6;
export const TEXT_MAX_FREE = 24;
export const textLimit = (zone: { kind: string }) =>
  zone.kind === "TEXT" ? TEXT_MAX_LENGTH : TEXT_MAX_FREE;
export const DEFAULT_TEXT_STYLE: TextStyle = { curve: 0, bold: false, italic: false };
// Text font size = scale * this many container-width percent units of the zone
export const TEXT_BASE_CQW = 24;

export const TEXT_FONTS: Record<FontKey, { label: string; css: string; cssVar: string }> = {
  sans: { label: "Clean", css: "var(--font-body), system-ui, sans-serif", cssVar: "--font-body" },
  display: { label: "Display", css: "var(--font-display), system-ui, sans-serif", cssVar: "--font-display" },
  serif: { label: "Playfair", css: "var(--font-playfair), Georgia, serif", cssVar: "--font-playfair" },
  bebas: { label: "Bebas", css: "var(--font-bebas), Impact, sans-serif", cssVar: "--font-bebas" },
  anton: { label: "Anton", css: "var(--font-anton), Impact, sans-serif", cssVar: "--font-anton" },
  montserrat: { label: "Montserrat", css: "var(--font-montserrat), system-ui, sans-serif", cssVar: "--font-montserrat" },
  abril: { label: "Abril", css: "var(--font-abril), Georgia, serif", cssVar: "--font-abril" },
  pacifico: { label: "Pacifico", css: "var(--font-pacifico), cursive", cssVar: "--font-pacifico" },
  lobster: { label: "Lobster", css: "var(--font-lobster), cursive", cssVar: "--font-lobster" },
  marker: { label: "Marker", css: "var(--font-marker), cursive", cssVar: "--font-marker" },
  caveat: { label: "Caveat", css: "var(--font-caveat), cursive", cssVar: "--font-caveat" },
  typewriter: { label: "Typewriter", css: "var(--font-typewriter), 'Courier New', monospace", cssVar: "--font-typewriter" },
};

export const FONT_KEYS = Object.keys(TEXT_FONTS) as FontKey[];

export const TEXT_COLORS = [
  "#14161B",
  "#FFFFFF",
  "#B3261E",
  "#E4572E",
  "#F2B84B",
  "#C9A227",
  "#2F6B4F",
  "#2547F5",
  "#22305A",
  "#7B3FA0",
  "#E87BA8",
  "#9AA0AE",
];

export type Guides = { x: number | null; y: number | null };
export const NO_GUIDES: Guides = { x: null, y: null };

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const normalizeAngle = (deg: number) =>
  ((((deg + 180) % 360) + 360) % 360) - 180;

export function isDark(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

// Largest size that keeps the whole image inside the zone, centered.
export function fitPlacement(zone: { w: number; h: number }, aspect: number): Placement {
  const zoneAspect = (zone.w * STAGE_W) / (zone.h * STAGE_H);
  return { x: 0.5, y: 0.5, scale: clamp(aspect / zoneAspect, SCALE_MIN, 1), rotation: 0 };
}

export const dpiFor = (pixelW: number, scale: number, widthIn: number) =>
  pixelW / (scale * widthIn);

// Half-size of the rotated layer as a fraction of the zone, on each axis.
// box is the unrotated layer size in percent of the zone; frame is the zone in px.
export function extents(
  p: Placement,
  box: { w: number; h: number },
  frame: { w: number; h: number }
) {
  const pw = (box.w / 100) * frame.w;
  const ph = (box.h / 100) * frame.h;
  const rad = (p.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    ex: (pw * c + ph * s) / 2 / frame.w,
    ey: (pw * s + ph * c) / 2 / frame.h,
  };
}

// Snap a layer center to the zone's center line or its edges.
export function snapAxis(center: number, half: number, threshold: number) {
  const targets = [
    { value: 0.5, guide: 0.5 },
    { value: half, guide: 0 },
    { value: 1 - half, guide: 1 },
  ];
  let best: { value: number; guide: number; d: number } | null = null;
  for (const t of targets) {
    const d = Math.abs(center - t.value);
    if (d <= threshold && (!best || d < best.d)) best = { ...t, d };
  }
  return best
    ? { value: best.value, guide: best.guide as number | null }
    : { value: center, guide: null as number | null };
}

// Text scale that makes `chars` characters fill a zone: about 70% of its height,
// but never wider than the zone. Used until the shopper resizes the text themselves.
export function fitTextScale(zone: { w: number; h: number }, chars: number) {
  const zoneW = (zone.w / 100) * STAGE_W;
  const zoneH = (zone.h / 100) * STAGE_H;
  const basePx = (TEXT_BASE_CQW / 100) * zoneW; // font size at scale 1
  const byHeight = (0.7 * zoneH) / basePx;
  const byWidth = (0.9 * zoneW) / (Math.max(1, chars) * 0.62 * basePx);
  return clamp(Math.min(byHeight, byWidth), SCALE_MIN, SCALE_MAX);
}
