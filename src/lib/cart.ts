import { TEXT_FONTS } from "@/lib/placement";
import type { FontKey, Placement } from "@/components/product/types";

export const MAX_QTY = 20;

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

// Placement is stored as JSON; never trust its shape when drawing it back.
export function asPlacement(value: unknown): Placement {
  const p = (value ?? {}) as Record<string, unknown>;
  return {
    x: isNum(p.x) ? p.x : 0.5,
    y: isNum(p.y) ? p.y : 0.5,
    scale: isNum(p.scale) ? p.scale : 0.5,
    rotation: isNum(p.rotation) ? p.rotation : 0,
  };
}

export function asFont(value: string | null): FontKey {
  return value && value in TEXT_FONTS ? (value as FontKey) : "sans";
}
