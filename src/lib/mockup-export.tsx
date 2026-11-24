import { renderToStaticMarkup } from "react-dom/server";
import ProductSilhouette, { ProductShade, type Shape } from "@/components/product/ProductSilhouette";
import type { LayerRender } from "@/components/product/LayerView";
import type { ViewKey } from "@/components/product/types";
import { TEXT_BASE_CQW } from "@/lib/placement";
import { curveGeometry, ensureFont, fontShorthand, measureText } from "@/lib/text-metrics";
import type { Box, PhotoTemplate } from "@/lib/mockup-photos";

// Draws a product mockup with its prints into a PNG, in the browser. Used for the "Download
// mockup" buttons in the editor and on the order page. Everything is drawn on a canvas so real
// web fonts and curved text come out exactly as on screen.

// key: the print area this layer belongs to ("front", "back", "monogram"...)
export type ExportZone = { key?: string; x: number; y: number; w: number; h: number; layer: LayerRender };
export type ExportView = { view: ViewKey; zones: ExportZone[] };

const W = 400;
const H = 420;
const SCALE = 3; // 1200 x 1260 px

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

// An SVG drawn as an image can't fetch anything, so mockup SVGs are self-contained.
const svgImage = (markup: string) =>
  loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      markup.replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" `)
    )}`
  );

// Design files are same-origin, but go through a blob so the canvas never gets tainted.
async function designImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load design");
  const blobUrl = URL.createObjectURL(await res.blob());
  try {
    return await loadImage(blobUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}

async function drawLayer(ctx: CanvasRenderingContext2D, box: Box, layer: LayerRender) {
  const { x: zx, y: zy, w: zw, h: zh } = box;
  const p = layer.placement;

  ctx.save();
  ctx.beginPath();
  ctx.rect(zx, zy, zw, zh);
  ctx.clip();
  ctx.translate(zx + p.x * zw, zy + p.y * zh);
  ctx.rotate((p.rotation * Math.PI) / 180);

  if (layer.kind === "image") {
    const img = await designImage(layer.imageUrl);
    const iw = p.scale * zw;
    const ih = iw / ((img.naturalWidth || 1) / (img.naturalHeight || 1));
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  } else {
    const { text, font, color, style } = layer;
    await ensureFont(font, style.bold, style.italic, text);
    const fs = p.scale * (TEXT_BASE_CQW / 100) * zw;
    ctx.font = fontShorthand(fs, font, style.bold, style.italic);
    ctx.fillStyle = color;

    if (!style.curve) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
    } else {
      // Glyph by glyph along the same arc the editor uses (geometry is at a 100px font).
      const f = fs / 100;
      const g = curveGeometry(measureText(text, font, style.bold, style.italic), style.curve);
      const r = g.r * f;
      const cx = (g.box.x + g.box.w / 2) * f;
      const cy = (g.box.y + g.box.h / 2) * f;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      let s = 0;
      for (const ch of text) {
        const w = ctx.measureText(ch).width;
        const mid = s + w / 2;
        s += w;
        const angle = g.up ? g.a1 + mid / r : g.a1 - mid / r;
        ctx.save();
        ctx.translate(r * Math.cos(angle) - cx, r * Math.sin(angle) - cy);
        ctx.rotate(g.up ? angle + Math.PI / 2 : angle - Math.PI / 2);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

async function renderView(shape: Shape, fill: string, v: ExportView): Promise<Blob> {
  const [silhouette, shade] = await Promise.all([
    svgImage(renderToStaticMarkup(<ProductSilhouette shape={shape} view={v.view} fill={fill} />)),
    svgImage(renderToStaticMarkup(<ProductShade shape={shape} view={v.view} />)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.scale(SCALE, SCALE);

  const bg = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, W * 0.75);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.55, "#f3f5f8");
  bg.addColorStop(1, "#e4e7ee");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.drawImage(silhouette, 0, 0, W, H);
  for (const z of v.zones) {
    await drawLayer(
      ctx,
      { x: (z.x / 100) * W, y: (z.y / 100) * H, w: (z.w / 100) * W, h: (z.h / 100) * H },
      z.layer
    );
  }

  // Shadows and folds go over the print, darkening only.
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(shade, 0, 0, W, H);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png")
  );
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Renders one PNG per view that has a print on it, without saving them. */
export async function renderMockups(opts: { shape: Shape; fill: string; views: ExportView[] }) {
  const out: { view: ViewKey; blob: Blob }[] = [];
  for (const v of opts.views.filter((x) => x.zones.length > 0)) {
    out.push({ view: v.view, blob: await renderView(opts.shape, opts.fill, v) });
  }
  return out;
}

/** Downloads one PNG per view that has a print on it. */
export async function downloadMockups(opts: {
  shape: Shape;
  fill: string;
  baseName: string;
  views: ExportView[];
}) {
  const rendered = await renderMockups(opts);
  for (const [i, r] of rendered.entries()) {
    save(r.blob, `${slug(opts.baseName)}-${r.view}.png`);
    if (i < rendered.length - 1) await new Promise((res) => setTimeout(res, 350));
  }
  return rendered.length;
}

// ---- Photo mockups -------------------------------------------------------------------------

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

/**
 * Recolours the white garment in a photo, using its cut-out mask (see scripts/build-mockup-masks.ts)
 * so the background, skin and jeans are untouched. The photo's own folds and light are kept and
 * made stronger for darker colours, otherwise a dark garment turns into a flat shape.
 */
async function tintGarment(ctx: CanvasRenderingContext2D, size: number, t: PhotoTemplate, hex: string) {
  const [tr, tg, tb] = hexToRgb(hex);
  const target = 0.299 * tr + 0.587 * tg + 0.114 * tb;
  // Already (almost) white: keep the photo as it is.
  if (target > 238) return;

  const maskImg = await loadImage(t.src.replace(/\.webp$/, "-mask.png?v=4"));
  const mc = document.createElement("canvas");
  mc.width = mc.height = size;
  const mctx = mc.getContext("2d", { willReadFrequently: true });
  if (!mctx) return;
  mctx.drawImage(maskImg, 0, 0, size, size);
  const mask = mctx.getImageData(0, 0, size, size).data;

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;

  // Typical brightness of the garment, so folds are measured against it.
  let sum = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (mask[i + 3] > 240) {
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      n++;
    }
  }
  if (n === 0) return;
  const ref = sum / n;

  const dark = 1 - target / 255;
  const gain = 1.3 + dark * 1.5;
  const sheen = dark * 70;

  for (let i = 0; i < d.length; i += 4) {
    const m = mask[i + 3] / 255;
    if (m <= 0) continue;
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const k = lum / ref;
    const kk = Math.min(1.7, Math.max(0.12, 1 + (k - 1) * gain));
    const lift = Math.max(0, k - 1) * sheen;
    d[i] += (Math.min(255, tr * kk + lift) - d[i]) * m;
    d[i + 1] += (Math.min(255, tg * kk + lift) - d[i + 1]) * m;
    d[i + 2] += (Math.min(255, tb * kk + lift) - d[i + 2]) * m;
  }
  ctx.putImageData(img, 0, 0);
}

/** A photo of a plain garment with the shopper's prints placed on it. */
export async function renderPhotoMockup(opts: {
  template: PhotoTemplate;
  fill: string;
  zones: ExportZone[];
}): Promise<Blob> {
  const { template: t } = opts;
  const photo = await loadImage(t.src);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = t.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(photo, 0, 0, t.size, t.size);

  // Prints are drawn on their own layer so fabric shading can be applied to them.
  const prints = document.createElement("canvas");
  prints.width = prints.height = t.size;
  const pctx = prints.getContext("2d");
  if (!pctx) throw new Error("Canvas is not available");
  for (const z of opts.zones) {
    const area = z.key ? t.areas[z.key] : undefined;
    if (area) await drawLayer(pctx, area, z.layer);
  }

  // Fabric shading: the photo's own creases and light, multiplied into the print.
  const shade = document.createElement("canvas");
  shade.width = shade.height = t.size;
  const sctx = shade.getContext("2d");
  if (!sctx) throw new Error("Canvas is not available");
  sctx.filter = "brightness(1.08) contrast(1.6)";
  sctx.drawImage(photo, 0, 0, t.size, t.size);
  sctx.filter = "none";
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(prints, 0, 0);
  pctx.globalCompositeOperation = "multiply";
  pctx.drawImage(shade, 0, 0);

  await tintGarment(ctx, t.size, t, opts.fill);
  ctx.globalAlpha = 0.97;
  ctx.drawImage(prints, 0, 0);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image"))), "image/png")
  );
}
