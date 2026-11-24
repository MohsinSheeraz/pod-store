import type { Shape } from "@/components/product/ProductSilhouette";

// A sample design on each product, in a colour of its own: used on tiles and the product page.
export const LOOKS: Record<Shape, { fill: string; design: string; x: number; y: number; w: number }> = {
  tee: { fill: "#ced4da", design: "/designs/good-vibes.svg", x: 50, y: 41, w: 28 },
  hoodie: { fill: "#1f2e4a", design: "/designs/bold-star.svg", x: 50, y: 43, w: 26 },
  mug: { fill: "#f8f9fa", design: "/designs/mountain-badge.svg", x: 50, y: 52, w: 26 },
  tote: { fill: "#343a40", design: "/designs/retro-stripes.svg", x: 50, y: 62, w: 34 },
  poster: { fill: "#f8f9fa", design: "/designs/sunset-wave.svg", x: 50, y: 50, w: 52 },
};
