import { useId, type ReactNode } from "react";

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
  `M130 30 L90 45 L20 95 L55 150 L95 125 L95 385 Q95 395 105 395 L295 395 Q305 395 305 385 L305 125 L345 150 L380 95 L310 45 L270 30 Q250 ${neck} 200 ${neck} Q150 ${neck} 130 30 Z`;

const hoodiePath = (neck: number) =>
  `M135 40 L95 55 L25 130 L60 175 L95 150 L95 390 Q95 400 105 400 L295 400 Q305 400 305 390 L305 150 L340 175 L375 130 L305 55 L265 40 Q250 ${neck} 200 ${neck} Q150 ${neck} 135 40 Z`;

const HOOD_FRONT = "M145 48 Q150 8 200 8 Q250 8 255 48 Q240 80 200 80 Q160 80 145 48 Z";
const HOOD_BACK = "M140 50 Q150 6 200 6 Q250 6 260 50 Q232 74 200 74 Q168 74 140 50 Z";
const MUG_BODY = "M110 120 L110 310 Q110 330 130 330 L270 330 Q290 330 290 310 L290 120 Z";
const MUG_HANDLE = "M290 165 h28 a42 42 0 0 1 0 104 h-28";
const TOTE_BODY = "M80 140 L320 140 L335 385 L65 385 Z";
const TOTE_STRAP = "M140 140 C140 30 260 30 260 140";
const POSTER = "M60 30 H340 V390 H60 Z";

function outlines(shape: Shape, back: boolean): string[] {
  switch (shape) {
    case "tee":
      return [teePath(back ? 40 : 60)];
    case "hoodie":
      return back ? [hoodiePath(60), HOOD_BACK] : [HOOD_FRONT, hoodiePath(75)];
    case "mug":
      return [MUG_BODY];
    case "tote":
      return [TOTE_BODY];
    case "poster":
      return [POSTER];
  }
}

type Props = {
  shape: Shape;
  view: "front" | "back";
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

export default function ProductSilhouette({ shape, fill, view }: Props & { fill: string }) {
  const uid = useUid();
  const back = view === "back";
  const clip = `${uid}-cp`;
  const hl = `${uid}-hl`;
  const ds = `${uid}-ds`;
  const soft = `${uid}-soft`;
  const weave = `${uid}-weave`;
  const outline = outlines(shape, back);

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
      </defs>

      {/* ---------------- T-shirt ---------------- */}
      {shape === "tee" && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={teePath(neck)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="90" y="0" width="220" height="420" fill={`url(#${hl})`} />
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
      {shape === "hoodie" && !back && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={HOOD_FRONT} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={hoodiePath(75)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="90" y="0" width="220" height="420" fill={`url(#${hl})`} />
          </g>
          {/* hood opening, drawstrings */}
          <path
            d="M150 50 Q160 80 200 80 Q240 80 250 50 Q238 68 200 70 Q162 68 150 50 Z"
            fill="rgba(0,0,0,0.2)"
          />
          <path d="M145 48 Q160 80 200 80 Q240 80 255 48" fill="none" stroke={DARK} strokeWidth="2" />
          <path d="M187 82 Q184 112 189 142" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M213 82 Q216 112 211 142" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M187 82 Q184 112 189 142" fill="none" stroke="#f4f1ea" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M213 82 Q216 112 211 142" fill="none" stroke="#f4f1ea" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="189" cy="144" r="3" fill="#cfc9bb" stroke={EDGE} />
          <circle cx="211" cy="144" r="3" fill="#cfc9bb" stroke={EDGE} />
          {/* kangaroo pocket */}
          <path
            d="M140 330 L260 330 L276 386 L124 386 Z"
            fill="rgba(0,0,0,0.05)"
            stroke={EDGE}
            strokeWidth="1.3"
          />
          <path d="M143 335 L257 335" {...stitch} />
          {/* seams, cuffs, hem rib */}
          <path d="M96 58 Q106 105 96 150" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M304 58 Q294 105 304 150" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M33 124 L68 169" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
          <path d="M367 124 L332 169" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
          <path d="M95 384 H305 V390 Q305 400 295 400 H105 Q95 400 95 390 Z" fill="rgba(0,0,0,0.08)" />
          <path d="M97 384 H303" {...stitch} />
        </>
      )}

      {shape === "hoodie" && back && (
        <>
          <g filter={`url(#${ds})`}>
            <path d={hoodiePath(60)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
            <path d={HOOD_BACK} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          </g>
          <g clipPath={`url(#${clip})`}>
            <rect x="90" y="0" width="220" height="420" fill={`url(#${hl})`} />
          </g>
          <path d="M140 52 Q150 70 200 70 Q250 70 260 52" fill="none" stroke={DARK} strokeWidth="2" />
          <path d="M200 8 V70" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2" />
          <path d="M96 58 Q106 105 96 150" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M304 58 Q294 105 304 150" fill="none" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2" />
          <path d="M33 124 L68 169" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
          <path d="M367 124 L332 169" fill="none" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
          <path d="M95 384 H305 V390 Q305 400 295 400 H105 Q95 400 95 390 Z" fill="rgba(0,0,0,0.08)" />
          <path d="M97 384 H303" {...stitch} />
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

function specFor(shape: Shape, back: boolean): Spec {
  switch (shape) {
    case "tee":
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
      return {
        x1: 25,
        x2: 375,
        edge: 0.13,
        folds: [
          "M114 205 Q140 255 120 325",
          "M286 215 Q262 262 282 340",
          "M62 130 Q78 150 72 168",
          "M338 130 Q322 150 328 168",
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
  const back = view === "back";
  const spec = specFor(shape, back);
  const clip = `${uid}-cp`;
  const edge = `${uid}-edge`;
  const vert = `${uid}-vert`;
  const blur = `${uid}-blur`;
  const w = spec.x2 - spec.x1;

  return (
    <svg className="stage-shade" viewBox="0 0 400 420" aria-hidden="true">
      <defs>
        <Clip id={clip} d={outlines(shape, back)} />
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
      <g clipPath={`url(#${clip})`}>
        <rect width="400" height="420" fill={`url(#${edge})`} />
        <rect width="400" height="420" fill={`url(#${vert})`} />
        <g filter={`url(#${blur})`} fill="none" stroke="#000" strokeLinecap="round" strokeWidth="9" opacity="0.05">
          {spec.folds.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
