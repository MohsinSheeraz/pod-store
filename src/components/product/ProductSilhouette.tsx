import { useId, type ReactNode } from "react";
import type { ViewKey } from "@/components/product/types";

export type Shape = "tee" | "hoodie" | "mug" | "tote" | "poster";

export function shapeFor(slug: string, categorySlug: string): Shape {
  if (slug.includes("hoodie")) return "hoodie";
  switch (categorySlug) {
    case "drinkware":
      return "mug";
    case "bags":
      return "tote";
    case "wall-art":
      return "poster";
    default:
      return "tee";
  }
}

// Studio-style mockups drawn in a 400 x 420 box. Print areas are stored as percentages of this
// box, so outlines must not move. Two layers share the same outlines:
//  - ProductSilhouette: the product itself (color, seams, stitching, highlights)
//  - ProductShade: soft shadows and folds drawn ON TOP of the print with multiply, so
//    artwork looks printed into the fabric instead of pasted over it.

const EDGE = "rgba(0,0,0,0.14)";
const DARK = "rgba(0,0,0,0.18)";

const teePath = (neck: number) =>
  `M130 30 Q108 36 90 46 Q52 66 20 95 L55 150 L95 125 L95 385 Q95 395 105 395 L295 395 Q305 395 305 385 L305 125 L345 150 L380 95 Q348 66 310 46 Q292 36 270 30 Q250 ${neck} 200 ${neck} Q150 ${neck} 130 30 Z`;

// Full-length sleeves hang down beside the body, as on a real hoodie.
const hoodiePath = (neck: number) =>
  `M135 40 Q105 46 88 62 Q56 80 44 112 Q22 205 20 330 L62 338 Q70 252 95 192 L95 390 Q95 400 105 400 L295 400 Q305 400 305 390 L305 192 Q330 252 338 338 L380 330 Q378 205 356 112 Q344 80 312 62 Q295 46 265 40 Q250 ${neck} 200 ${neck} Q150 ${neck} 135 40 Z`;

// Side profiles (wearer's left; the right view is this mirrored). Front of the garment faces left.
const TEE_SIDE_BODY = "M151 58 Q163 36 198 34 Q233 36 243 60 L247 392 Q247 398 239 398 L159 398 Q151 398 151 392 Z";
const TEE_SIDE_SLEEVE = "M148 54 Q198 30 252 56 L262 160 Q200 182 138 160 Z";
const HOOD_SIDE_HOOD = "M192 40 Q242 14 282 50 Q304 96 262 140 L254 72 Q232 44 192 40 Z";
const HOOD_SIDE_BODY = "M160 70 Q164 44 206 40 Q250 44 254 72 L260 400 Q260 406 252 406 L164 406 Q156 406 156 400 Z";
const HOOD_SIDE_SLEEVE = "M160 62 Q204 40 250 62 Q254 130 236 220 Q228 290 230 348 Q184 362 138 346 Q138 260 152 190 Q164 120 160 62 Z";

const HOOD_FRONT = "M145 48 Q150 8 200 8 Q250 8 255 48 Q240 80 200 80 Q160 80 145 48 Z";
const HOOD_BACK = "M140 50 Q150 6 200 6 Q250 6 260 50 Q232 74 200 74 Q168 74 140 50 Z";
const MUG_BODY = "M110 120 L110 310 Q110 330 130 330 L270 330 Q290 330 290 310 L290 120 Z";
const MUG_HANDLE = "M290 165 h28 a42 42 0 0 1 0 104 h-28";
const TOTE_BODY = "M80 140 L320 140 L335 385 L65 385 Z";
const TOTE_STRAP = "M140 140 C140 30 260 30 260 140";
const POSTER = "M60 30 H340 V390 H60 Z";

const isSide = (view: ViewKey) => view === "left" || view === "right";

function outlines(shape: Shape, view: ViewKey): string[] {
  const back = view === "back";
  switch (shape) {
    case "tee":
      return isSide(view) ? [TEE_SIDE_BODY, TEE_SIDE_SLEEVE] : [teePath(back ? 40 : 60)];
    case "hoodie":
      if (isSide(view)) return [HOOD_SIDE_HOOD, HOOD_SIDE_BODY, HOOD_SIDE_SLEEVE];
      return back ? [hoodiePath(60), HOOD_BACK] : [HOOD_FRONT, hoodiePath(75)];
    case "mug":
      return [MUG_BODY];
    case "tote":
      return [TOTE_BODY];
    case "poster":
      return [POSTER];
  }
}

// The right-hand profile is the left one mirrored.
const mirrorOf = (view: ViewKey) => (view === "right" ? "translate(400 0) scale(-1 1)" : undefined);

type Props = {
  shape: Shape;
  view: ViewKey;
};

const stitch = {
  fill: "none",
  stroke: "rgba(0,0,0,0.2)",
  strokeWidth: 1,
  strokeDasharray: "3 2.5",
  strokeLinecap: "round" as const,
};

function useUid() {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}

function Clip({ id, d }: { id: string; d: string[] }) {
  return (
    <clipPath id={id}>
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </clipPath>
  );
}


// Rib lines between two edges (used for cuffs and the hem band).
function ribLines(from: [number, number], to: [number, number], from2: [number, number], to2: [number, number], n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return `M${lerp(from[0], to[0]).toFixed(1)} ${lerp(from[1], to[1]).toFixed(1)} L${lerp(from2[0], to2[0]).toFixed(1)} ${lerp(from2[1], to2[1]).toFixed(1)}`;
  }).join(" ");
}

const HEM_RIBS = ribLines([95, 368], [305, 368], [95, 398], [305, 398], 27);
const CUFF_L_RIBS = ribLines([20.6, 310], [64, 320], [20, 330], [62, 338], 6);
const CUFF_R_RIBS = ribLines([379.4, 310], [336, 320], [380, 330], [338, 338], 6);

// Everything that makes the hoodie read as a real garment: cylindrical sleeve shading, the
// underarm shadow, a ribbed neckline, hood folds, a pocket with depth, ribbed cuffs and hem.
function HoodieDetail({
  uid,
  back,
  clip,
  hl,
  soft,
}: {
  uid: string;
  back: boolean;
  clip: string;
  hl: string;
  soft: string;
}) {
  const sleeveL = `${uid}-sl-l`;
  const sleeveR = `${uid}-sl-r`;
  const body = `${uid}-body`;
  const pocket = `${uid}-pocket`;
  const hood = `${uid}-hood`;
  return (
    <>
      <defs>
        <linearGradient id={sleeveL} gradientUnits="userSpaceOnUse" x1="20" x2="96" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={sleeveR} gradientUnits="userSpaceOnUse" x1="380" x2="304" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.75" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={body} gradientUnits="userSpaceOnUse" x1="95" x2="305" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.14" stopColor="#000" stopOpacity="0.04" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={pocket} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id={hood} cx="0.5" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect x="90" y="0" width="220" height="420" fill={`url(#${hl})`} />
        <rect x="95" y="0" width="210" height="420" fill={`url(#${body})`} />
        <path d="M56 80 Q22 205 20 330 L62 338 Q70 252 95 192 L95 60 Z" fill={`url(#${sleeveL})`} />
        <path d="M344 80 Q378 205 380 330 L338 338 Q330 252 305 192 L305 60 Z" fill={`url(#${sleeveR})`} />
        <path d={back ? HOOD_BACK : HOOD_FRONT} fill={`url(#${hood})`} />
        {/* underarm shadow where the sleeve folds against the body */}
        <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.16">
          <path d="M100 150 Q108 230 98 330" strokeWidth="9" />
          <path d="M300 150 Q292 230 302 330" strokeWidth="9" />
        </g>
        {/* soft shoulder light and sleeve creases */}
        <g filter={`url(#${soft})`} fill="none" stroke="#fff" strokeLinecap="round" opacity="0.3">
          <path d="M118 72 Q150 92 168 100" strokeWidth="7" />
          <path d="M282 72 Q250 92 232 100" strokeWidth="7" />
        </g>
        <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.1">
          <path d="M30 220 Q58 236 86 214" strokeWidth="6" />
          <path d="M28 262 Q52 272 78 256" strokeWidth="5" />
          <path d="M370 220 Q342 236 314 214" strokeWidth="6" />
          <path d="M372 262 Q348 272 322 256" strokeWidth="5" />
          <path d="M24 296 Q44 292 62 302" strokeWidth="5" />
          <path d="M376 296 Q356 292 338 302" strokeWidth="5" />
        </g>
      </g>

      {/* hood */}
      {back ? (
        <>
          <path d="M140 52 Q150 70 200 70 Q250 70 260 52" fill="none" stroke={DARK} strokeWidth="2.4" />
          <path d="M200 8 V70" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.4" />
          <path d="M201.5 8 V70" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
          <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.12">
            <path d="M172 14 Q164 42 156 62" strokeWidth="5" />
            <path d="M228 14 Q236 42 244 62" strokeWidth="5" />
          </g>
        </>
      ) : (
        <>
          <path d="M150 50 Q160 80 200 80 Q240 80 250 50 Q238 68 200 70 Q162 68 150 50 Z" fill="rgba(0,0,0,0.26)" />
          <path d="M145 48 Q160 80 200 80 Q240 80 255 48" fill="none" stroke={DARK} strokeWidth="2.2" />
          <path d="M139 44 Q154 84 200 84 Q246 84 261 44" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="6" strokeLinecap="round" />
          <path d="M141 42 Q156 80 200 80 Q244 80 259 42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
          <path d="M200 8 V44" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.3" />
          <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.12">
            <path d="M174 16 Q166 36 160 54" strokeWidth="5" />
            <path d="M226 16 Q234 36 240 54" strokeWidth="5" />
          </g>
          {/* drawstrings, eyelets and aglets */}
          <circle cx="186" cy="84" r="2.8" fill="rgba(0,0,0,0.3)" />
          <circle cx="214" cy="84" r="2.8" fill="rgba(0,0,0,0.3)" />
          <path d="M186 85 Q181 116 187 150" fill="none" stroke="rgba(0,0,0,0.24)" strokeWidth="5" strokeLinecap="round" />
          <path d="M214 85 Q219 116 213 150" fill="none" stroke="rgba(0,0,0,0.24)" strokeWidth="5" strokeLinecap="round" />
          <path d="M186 85 Q181 116 187 150" fill="none" stroke="#f4f1ea" strokeWidth="3" strokeLinecap="round" />
          <path d="M214 85 Q219 116 213 150" fill="none" stroke="#f4f1ea" strokeWidth="3" strokeLinecap="round" />
          <path d="M185.2 90 Q181.6 118 186.6 146" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <rect x="184.8" y="148" width="4.4" height="11" rx="2.2" fill="#d6d0c2" stroke={EDGE} />
          <rect x="210.8" y="148" width="4.4" height="11" rx="2.2" fill="#d6d0c2" stroke={EDGE} />
        </>
      )}

      {/* kangaroo pocket (front only) */}
      {!back && (
        <>
          <path d="M140 314 L260 314 L274 364 L126 364 Z" fill={`url(#${pocket})`} stroke={EDGE} strokeWidth="1.3" />
          <path d="M141 317 L259 317" {...stitch} />
          <path d="M127.5 361 L272.5 361" {...stitch} />
          <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.14">
            <path d="M138 319 L262 319" strokeWidth="5" />
          </g>
          <path d="M126 364 L274 364" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
          <path d="M142 314 L128 363" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.6" />
          <path d="M258 314 L272 363" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.6" />
        </>
      )}

      {/* shoulder and armhole seams */}
      <path d="M97 58 Q101 125 96 190" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.3" />
      <path d="M303 58 Q299 125 304 190" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.3" />
      <path d="M99 60 Q103 125 98 188" {...stitch} />
      <path d="M301 60 Q297 125 302 188" {...stitch} />

      {/* ribbed cuffs */}
      <path d="M20.6 310 L64 320 L62 338 L20 330 Z" fill="rgba(0,0,0,0.12)" />
      <path d="M379.4 310 L336 320 L338 338 L380 330 Z" fill="rgba(0,0,0,0.12)" />
      <path d={CUFF_L_RIBS} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1" />
      <path d={CUFF_R_RIBS} fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1" />
      <path d="M22 311 L64 321" {...stitch} />
      <path d="M378 311 L336 321" {...stitch} />

      {/* ribbed hem band */}
      <path d="M95 368 H305 V390 Q305 400 295 400 H105 Q95 400 95 390 Z" fill="rgba(0,0,0,0.11)" />
      <path d={HEM_RIBS} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <path d="M97 368 H303" {...stitch} />
      <path d="M97 366 H303" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </>
  );
}

export default function ProductSilhouette({ shape, fill, view }: Props & { fill: string }) {
  const uid = useUid();
  const back = view === "back";
  const side = isSide(view);
  const clip = `${uid}-cp`;
  const hl = `${uid}-hl`;
  const ds = `${uid}-ds`;
  const soft = `${uid}-soft`;
  const weave = `${uid}-weave`;
  const outline = outlines(shape, view);

  const neck = shape === "tee" ? (back ? 40 : 60) : back ? 60 : 75;

  return (
    <svg className="stage-svg" viewBox="0 0 400 420" aria-hidden="true">
      <defs>
        <filter id={ds} x="-20%" y="-10%" width="140%" height="135%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#1a1d29" floodOpacity="0.2" />
        </filter>
        <filter id={soft} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id={hl} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <pattern id={weave} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0H4M0 0V4" stroke="rgba(0,0,0,0.05)" strokeWidth="0.7" fill="none" />
        </pattern>
        <Clip id={clip} d={outline} />
        <linearGradient id={`${uid}-tbody`} gradientUnits="userSpaceOnUse" x1="95" x2="305" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.15" />
          <stop offset="0.14" stopColor="#000" stopOpacity="0.04" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.17" />
        </linearGradient>
        <linearGradient id={`${uid}-tsl-l`} gradientUnits="userSpaceOnUse" x1="20" x2="96" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={`${uid}-tsl-r`} gradientUnits="userSpaceOnUse" x1="380" x2="304" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <g transform={mirrorOf(view)}>

      {/* ---------------- T-shirt ---------------- */}
      {shape === "tee" && !side && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={teePath(neck)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="90" y="0" width="220" height="420" fill={`url(#${hl})`} />
            <rect x="95" y="0" width="210" height="420" fill={`url(#${uid}-tbody)`} />
            <path d="M52 70 L20 95 L55 150 L95 125 L95 50 Z" fill={`url(#${uid}-tsl-l)`} />
            <path d="M348 70 L380 95 L345 150 L305 125 L305 50 Z" fill={`url(#${uid}-tsl-r)`} />
            <g filter={`url(#${soft})`} fill="none" stroke="#000" strokeLinecap="round" opacity="0.15">
              <path d="M99 130 Q106 230 99 380" strokeWidth="8" />
              <path d="M301 130 Q294 230 301 380" strokeWidth="8" />
            </g>
            <g filter={`url(#${soft})`} fill="none" stroke="#fff" strokeLinecap="round" opacity="0.28">
              <path d="M120 66 Q150 86 168 92" strokeWidth="7" />
              <path d="M280 66 Q250 86 232 92" strokeWidth="7" />
            </g>
          </g>
          {/* ribbed collar */}
          <path
            d={`M131 34 Q151 ${neck + 5} 200 ${neck + 5} Q249 ${neck + 5} 269 34`}
            fill="none"
            stroke={DARK}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d={`M134 31 Q152 ${neck + 1} 200 ${neck + 1} Q248 ${neck + 1} 266 31`}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.4"
          />
          {back && (
            <rect x="190" y="50" width="20" height="10" rx="1.5" fill="rgba(255,255,255,0.7)" stroke={EDGE} />
          )}
          {/* shoulder / armhole seams */}
          <path d="M91 48 Q101 90 96 124" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M309 48 Q299 90 304 124" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          {/* hem and sleeve-hem stitching */}
          <path d="M97 382 H303" {...stitch} />
          <path d="M26 92 L60 147" {...stitch} />
          <path d="M374 92 L340 147" {...stitch} />
        </>
      )}

      {/* ---------------- Hoodie ---------------- */}
      {shape === "hoodie" && !side && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={back ? HOOD_BACK : HOOD_FRONT} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={hoodiePath(back ? 60 : 75)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <HoodieDetail uid={uid} back={back} clip={clip} hl={hl} soft={soft} />
        </>
      )}

      {/* ---------------- Side profiles (sleeve prints) ---------------- */}
      {shape === "tee" && side && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={TEE_SIDE_BODY} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={TEE_SIDE_SLEEVE} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="125" y="0" width="140" height="420" fill={`url(#${hl})`} />
          </g>
          <path d="M160 44 Q198 62 236 44" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
          <path d="M149 56 Q152 110 140 158" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M141 153 Q200 175 259 155" {...stitch} />
          <path d="M199 186 V386" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2" />
          <path d="M153 386 H245" {...stitch} />
        </>
      )}

      {shape === "hoodie" && side && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={HOOD_SIDE_HOOD} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={HOOD_SIDE_BODY} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={HOOD_SIDE_SLEEVE} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="135" y="0" width="150" height="420" fill={`url(#${hl})`} />
          </g>
          <path d="M224 40 Q266 36 276 96" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
          <path d="M158 62 Q162 200 140 344" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
          <path d="M139 326 Q184 342 230 328 L230 348 Q184 362 138 346 Z" fill="rgba(0,0,0,0.1)" />
          <path d="M140 328 Q184 344 230 330" {...stitch} />
          <path d="M156 392 H260 V400 Q260 406 252 406 H164 Q156 406 156 400 Z" fill="rgba(0,0,0,0.08)" />
        </>
      )}

      {/* ---------------- Mug ---------------- */}
      {shape === "mug" && (
        <>
          <ellipse cx="205" cy="338" rx="112" ry="13" fill="rgba(20,24,40,0.2)" filter={`url(#${soft})`} />
          <path d={MUG_HANDLE} fill="none" stroke={EDGE} strokeWidth="25" />
          <path d={MUG_HANDLE} fill="none" stroke={fill} strokeWidth="20" />
          <path d={MUG_HANDLE} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" transform="translate(0 -4)" />
          <path d={MUG_HANDLE} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="5" transform="translate(0 6)" />
          <path d={MUG_BODY} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <g clipPath={`url(#${clip})`}>
            <rect x="124" y="122" width="14" height="206" rx="7" fill="#fff" opacity="0.4" filter={`url(#${soft})`} />
            <rect x="146" y="122" width="4" height="206" rx="2" fill="#fff" opacity="0.22" />
          </g>
          <ellipse cx="200" cy="120" rx="90" ry="14" fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <ellipse cx="200" cy="122" rx="82" ry="10.5" fill="rgba(0,0,0,0.16)" />
          <ellipse cx="200" cy="124" rx="76" ry="7" fill="rgba(0,0,0,0.12)" />
        </>
      )}

      {/* ---------------- Tote ---------------- */}
      {shape === "tote" && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={TOTE_STRAP} fill="none" stroke={EDGE} strokeWidth="14" />
            <path d={TOTE_STRAP} fill="none" stroke={fill} strokeWidth="10" />
            <path d={TOTE_BODY} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <path d={TOTE_STRAP} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" transform="translate(-1.5 0)" />
          <g clipPath={`url(#${clip})`}>
            <rect x="60" y="140" width="280" height="250" fill={`url(#${weave})`} />
            <rect x="110" y="140" width="190" height="250" fill={`url(#${hl})`} />
          </g>
          <path d="M80 140 L320 140 L321.5 158 L78.5 158 Z" fill="rgba(0,0,0,0.05)" />
          <path d="M80 155 H320" {...stitch} />
          <g fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeDasharray="3 2.5">
            <rect x="131" y="142" width="18" height="26" />
            <path d="M131 142 L149 168 M149 142 L131 168" />
            <rect x="251" y="142" width="18" height="26" />
            <path d="M251 142 L269 168 M269 142 L251 168" />
          </g>
          <path d="M67 372 H333" {...stitch} />
        </>
      )}

      {/* ---------------- Poster ---------------- */}
      {shape === "poster" && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={POSTER} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g transform="rotate(-38 60 30)">
            <rect x="40" y="22" width="44" height="14" fill="rgba(255,255,255,0.6)" stroke="rgba(0,0,0,0.12)" />
          </g>
          <g transform="rotate(38 340 30)">
            <rect x="316" y="22" width="44" height="14" fill="rgba(255,255,255,0.6)" stroke="rgba(0,0,0,0.12)" />
          </g>
        </>
      )}

      </g>
    </svg>
  );
}

type Spec = {
  // horizontal extent the edge darkening spans
  x1: number;
  x2: number;
  edge: number;
  folds: string[];
  extra?: ReactNode;
};

function specFor(shape: Shape, view: ViewKey): Spec {
  const back = view === "back";
  switch (shape) {
    case "tee":
      if (isSide(view)) {
        return { x1: 138, x2: 262, edge: 0.13, folds: ["M156 72 Q170 120 150 156", "M196 220 Q220 290 202 360", "M232 96 Q248 130 250 156"] };
      }
      return {
        x1: 20,
        x2: 380,
        edge: 0.12,
        folds: [
          "M112 205 Q138 240 120 300",
          "M288 215 Q266 255 282 322",
          "M150 338 Q200 356 252 340",
          "M62 92 Q76 108 70 132",
          "M338 92 Q324 108 330 132",
          ...(back ? [] : ["M165 112 Q200 130 236 112"]),
        ],
      };
    case "hoodie":
      if (isSide(view)) {
        return { x1: 138, x2: 282, edge: 0.14, folds: ["M170 110 Q196 220 160 330", "M226 90 Q244 200 232 330", "M246 60 Q280 80 284 120"] };
      }
      return {
        x1: 25,
        x2: 375,
        edge: 0.13,
        folds: [
          "M114 205 Q140 255 120 325",
          "M286 215 Q262 262 282 340",
          "M58 130 Q44 230 46 310",
          "M342 130 Q356 230 354 310",
          ...(back ? ["M150 120 Q200 140 252 120"] : ["M150 86 Q200 108 250 86"]),
        ],
      };
    case "mug":
      return { x1: 110, x2: 290, edge: 0.3, folds: [] };
    case "tote":
      return {
        x1: 65,
        x2: 335,
        edge: 0.12,
        folds: ["M104 210 Q146 252 118 332", "M296 220 Q262 262 284 340", "M120 372 Q200 384 280 372"],
      };
    case "poster":
      return { x1: 60, x2: 340, edge: 0.1, folds: ["M60 372 Q200 392 340 372"] };
  }
}

// Darkening only (multiply), drawn over the print so artwork picks up the product's
// shading. Sits above print areas but never takes clicks.
export function ProductShade({ shape, view }: Props) {
  const uid = useUid();
  const spec = specFor(shape, view);
  const clip = `${uid}-cp`;
  const edge = `${uid}-edge`;
  const vert = `${uid}-vert`;
  const blur = `${uid}-blur`;
  const w = spec.x2 - spec.x1;

  return (
    <svg className="stage-shade" viewBox="0 0 400 420" aria-hidden="true">
      <defs>
        <Clip id={clip} d={outlines(shape, view)} />
        <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id={edge} gradientUnits="userSpaceOnUse" x1={spec.x1} x2={spec.x2} y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={spec.edge} />
          <stop offset={Math.min(0.2, 30 / w)} stopColor="#000" stopOpacity="0.03" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset={1 - Math.min(0.25, 36 / w)} stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity={spec.edge * 1.1} />
        </linearGradient>
        <linearGradient id={vert} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="420">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <g transform={mirrorOf(view)}>
      <g clipPath={`url(#${clip})`}>
        <rect width="400" height="420" fill={`url(#${edge})`} />
        <rect width="400" height="420" fill={`url(#${vert})`} />
        <g filter={`url(#${blur})`} fill="none" stroke="#000" strokeLinecap="round" strokeWidth="9" opacity="0.05">
          {spec.folds.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      </g>
    </svg>
  );
}
