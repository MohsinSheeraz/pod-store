import { TEXT_FONTS } from "@/lib/placement";
import type { FontKey } from "@/components/product/types";

// Everything here runs in the browser only (canvas + document.fonts).

export const textWeight = (bold: boolean) => (bold ? 800 : 600);

export function resolveFamily(font: FontKey) {
  if (typeof document === "undefined") return "sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue(TEXT_FONTS[font].cssVar).trim();
  return v ? `${v}, sans-serif` : "sans-serif";
}

export const fontShorthand = (px: number, font: FontKey, bold: boolean, italic: boolean) =>
  `${italic ? "italic " : ""}${textWeight(bold)} ${px}px ${resolveFamily(font)}`;

let ctx: CanvasRenderingContext2D | null = null;

/** Width of the text at a 100px font size. */
export function measureText(text: string, font: FontKey, bold: boolean, italic: boolean) {
  if (typeof document === "undefined") return text.length * 55;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 55;
  ctx.font = fontShorthand(100, font, bold, italic);
  return ctx.measureText(text).width;
}

/** Waits until the font used by this text is loaded, so measuring and drawing are exact. */
export async function ensureFont(font: FontKey, bold: boolean, italic: boolean, text: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(fontShorthand(100, font, bold, italic), text || "Aa");
  } catch {
    /* fall back to whatever is available */
  }
}

// curve -100..100 -> how much of a circle the text wraps (up to 270 degrees)
export const curveAngle = (curve: number) => (Math.min(100, Math.abs(curve)) / 100) * Math.PI * 1.5;

/**
 * An arc for text of width `len` (at a 100px font). Positive curve arches up (text on top of a
 * circle), negative arches down. Coordinates are in font units, centered on the circle.
 */
export function curveGeometry(len: number, curve: number) {
  const theta = Math.max(0.05, curveAngle(curve));
  const r = len / theta;
  const up = curve > 0;
  const a1 = up ? -Math.PI / 2 - theta / 2 : Math.PI / 2 + theta / 2;
  const a2 = up ? -Math.PI / 2 + theta / 2 : Math.PI / 2 - theta / 2;
  const pt = (a: number) => [r * Math.cos(a), r * Math.sin(a)] as const;
  const [x1, y1] = pt(a1);
  const [x2, y2] = pt(a2);
  const d = `M ${x1} ${y1} A ${r} ${r} 0 ${theta > Math.PI ? 1 : 0} ${up ? 1 : 0} ${x2} ${y2}`;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= 24; i++) {
    const [x, y] = pt(a1 + ((a2 - a1) * i) / 24);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const padX = 55;
  const padY = 95;
  return {
    d,
    r,
    theta,
    up,
    a1,
    a2,
    box: { x: minX - padX, y: minY - padY, w: maxX - minX + padX * 2, h: maxY - minY + padY * 2 },
  };
}
