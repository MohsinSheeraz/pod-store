// Cuts each garment out of its mockup photo and saves the cut-out as <photo>-mask.png.
// The shop uses these masks to recolour the garment cleanly (no jagged edges, background,
// skin and jeans untouched).
//
// Run after adding or changing a photo in /public/mockups:  npx tsx scripts/build-mockup-masks.ts
//
// How: the rough outline in lib/mockup-photos.ts gives "surely garment" (well inside it) and
// "surely not" (well outside it, or skin / dark / coloured pixels). A marker watershed on the
// image gradient then settles the exact edge between the two.
import path from "node:path";
import sharp from "sharp";
import { PHOTO_MOCKUPS } from "../src/lib/mockup-photos";

const S = 1024;

function polygonMask(points: [number, number][]) {
  const m = new Uint8Array(S * S);
  for (let y = 0; y < S; y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(S - 1, Math.floor(xs[k + 1])); x++) m[y * S + x] = 1;
    }
  }
  return m;
}

// Distance (in pixels, chamfer) from each pixel to the nearest pixel where `src` is 1.
function distanceTo(src: Uint8Array) {
  const INF = 1e9;
  const d = new Float32Array(S * S);
  for (let i = 0; i < d.length; i++) d[i] = src[i] ? 0 : INF;
  const a = 1;
  const b = 1.4142;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) {
        v = Math.min(v, d[i - S] + a);
        if (x > 0) v = Math.min(v, d[i - S - 1] + b);
        if (x < S - 1) v = Math.min(v, d[i - S + 1] + b);
      }
      d[i] = v;
    }
  }
  for (let y = S - 1; y >= 0; y--) {
    for (let x = S - 1; x >= 0; x--) {
      const i = y * S + x;
      let v = d[i];
      if (x < S - 1) v = Math.min(v, d[i + 1] + a);
      if (y < S - 1) {
        v = Math.min(v, d[i + S] + a);
        if (x < S - 1) v = Math.min(v, d[i + S + 1] + b);
        if (x > 0) v = Math.min(v, d[i + S - 1] + b);
      }
      d[i] = v;
    }
  }
  return d;
}

async function cutOut(file: string, outline: [number, number][]) {
  const { data } = await sharp(file).resize(S, S).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = new Float32Array(S * S);
  const sat = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  // gradient magnitude of the slightly smoothed luminance
  const sm = new Float32Array(S * S);
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x;
      sm[i] =
        (lum[i] * 4 + lum[i - 1] + lum[i + 1] + lum[i - S] + lum[i + S]) / 8;
    }
  }
  const grad = new Uint8Array(S * S);
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x;
      const gx = sm[i + 1] - sm[i - 1];
      const gy = sm[i + S] - sm[i - S];
      grad[i] = Math.min(255, Math.round(Math.hypot(gx, gy) * 6));
    }
  }

  const poly = polygonMask(outline);
  const outside = new Uint8Array(S * S);
  for (let i = 0; i < outside.length; i++) outside[i] = poly[i] ? 0 : 1;
  const dIn = distanceTo(outside); // inside the polygon: distance to its edge
  const dOut = distanceTo(poly); // outside the polygon: distance to its edge

  // 1 = garment, 2 = not garment, 0 = undecided
  const label = new Uint8Array(S * S);
  for (let i = 0; i < label.length; i++) {
    const clearlyNot = lum[i] < 105 || sat[i] > 34;
    if (poly[i] && dIn[i] >= 9 && lum[i] >= 214 && sat[i] < 22) label[i] = 1;
    // bright, colourless pixels just outside the rough outline are fabric too (the backdrop is darker)
    else if (!poly[i] && dOut[i] < 34 && lum[i] >= 226 && sat[i] < 18) label[i] = 1;
    else if (clearlyNot || (!poly[i] && dOut[i] >= 20)) label[i] = 2;
  }

  // Marker watershed: flood from the seeds, lowest gradient first.
  const BUCKETS = 256;
  const queues: number[][] = Array.from({ length: BUCKETS }, () => []);
  const push = (i: number) => queues[grad[i]].push(i);
  const neighbours = (i: number, fn: (j: number) => void) => {
    const x = i % S;
    if (x > 0) fn(i - 1);
    if (x < S - 1) fn(i + 1);
    if (i >= S) fn(i - S);
    if (i < S * (S - 1)) fn(i + S);
  };
  for (let i = 0; i < label.length; i++) {
    if (label[i]) neighbours(i, (j) => (label[j] === 0 ? push(j) : undefined));
  }
  // remember which seed colonised a pixel: take the label of whichever labelled neighbour reached it
  for (let level = 0; level < BUCKETS; level++) {
    const q = queues[level];
    while (q.length) {
      const i = q.pop() as number;
      if (label[i]) continue;
      let l = 0;
      neighbours(i, (j) => {
        if (label[j] && (!l || label[j] === 2)) l = label[j];
      });
      // a pixel next to both stays with the "not garment" side: a clean edge beats a halo
      label[i] = l || 2;
      neighbours(i, (j) => {
        if (!label[j]) queues[Math.max(level, grad[j])].push(j);
      });
    }
  }

  // Soften the edge by one pixel so it blends into the photo.
  // The outline is trusted well inside it (shaded sleeves and folds are darker than the
  // background, so the gradient alone would drop them); the watershed settles the edge band.
  const hard = new Uint8Array(S * S);
  for (let i = 0; i < hard.length; i++) {
    const clearlyNot = lum[i] < 105 || sat[i] > 34;
    const core = poly[i] === 1 && dIn[i] >= 8 && !clearlyNot;
    const edge = label[i] === 1 && (poly[i] === 1 || dOut[i] <= 34);
    hard[i] = core || edge ? 255 : 0;
  }
  // Round off spikes first (blur, then cut at half), then soften the edge.
  const { data: roundedRaw, info: rInfo } = await sharp(hard, { raw: { width: S, height: S, channels: 1 } })
    .blur(3.5)
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rounded = Buffer.alloc(S * S);
  for (let i = 0; i < S * S; i++) rounded[i] = roundedRaw[i * rInfo.channels];
  const { data: soft, info } = await sharp(rounded, { raw: { width: S, height: S, channels: 1 } })
    .blur(0.8)
    .raw()
    .toBuffer({ resolveWithObject: true });
  // White pixels whose alpha is the mask: browsers read alpha exactly, whereas grey levels of
  // a greyscale PNG can be shifted by colour management.
  const rgba = Buffer.alloc(S * S * 4, 255);
  for (let i = 0; i < S * S; i++) rgba[i * 4 + 3] = soft[i * info.channels];
  return sharp(rgba, { raw: { width: S, height: S, channels: 4 } }).png().toBuffer();
}

async function main() {
  for (const templates of Object.values(PHOTO_MOCKUPS)) {
    for (const t of templates ?? []) {
      const file = path.join(process.cwd(), "public", t.src);
      const out = file.replace(/\.webp$/, "-mask.png");
      const png = await cutOut(file, t.outline);
      await sharp(png).toFile(out);
      console.log("wrote", path.basename(out));
    }
  }
}

main();
