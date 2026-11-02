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

const EDGE = "rgba(0,0,0,0.16)";

const teePath = (neck: number) =>
  `M130 30 L90 45 L20 95 L55 150 L95 125 L95 385 Q95 395 105 395 L295 395 Q305 395 305 385 L305 125 L345 150 L380 95 L310 45 L270 30 Q250 ${neck} 200 ${neck} Q150 ${neck} 130 30 Z`;

const hoodiePath = (neck: number) =>
  `M135 40 L95 55 L25 130 L60 175 L95 150 L95 390 Q95 400 105 400 L295 400 Q305 400 305 390 L305 150 L340 175 L375 130 L305 55 L265 40 Q250 ${neck} 200 ${neck} Q150 ${neck} 135 40 Z`;

export default function ProductSilhouette({
  shape,
  fill,
  view,
}: {
  shape: Shape;
  fill: string;
  view: "front" | "back";
}) {
  const back = view === "back";

  return (
    <svg className="stage-svg" viewBox="0 0 400 420" aria-hidden="true">
      {shape === "tee" && (
        <>
          <path d={teePath(back ? 40 : 60)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <path
            d={`M130 30 Q150 ${back ? 40 : 60} 200 ${back ? 40 : 60} Q250 ${back ? 40 : 60} 270 30`}
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="2"
          />
        </>
      )}

      {shape === "hoodie" && !back && (
        <>
          <path
            d="M145 48 Q150 8 200 8 Q250 8 255 48 Q240 80 200 80 Q160 80 145 48 Z"
            fill={fill}
            stroke={EDGE}
            strokeWidth="1.5"
          />
          <path d={hoodiePath(75)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <path
            d="M145 48 Q160 80 200 80 Q240 80 255 48"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="2"
          />
          <path
            d="M140 330 L260 330 L275 385 L125 385 Z"
            fill="rgba(0,0,0,0.05)"
            stroke={EDGE}
            strokeWidth="1.5"
          />
        </>
      )}

      {shape === "hoodie" && back && (
        <>
          <path d={hoodiePath(60)} fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <path
            d="M140 50 Q150 6 200 6 Q250 6 260 50 Q232 74 200 74 Q168 74 140 50 Z"
            fill={fill}
            stroke={EDGE}
            strokeWidth="1.5"
          />
        </>
      )}

      {shape === "mug" && (
        <>
          <path d="M290 165 h28 a42 42 0 0 1 0 104 h-28" fill="none" stroke={EDGE} strokeWidth="24" />
          <path d="M290 165 h28 a42 42 0 0 1 0 104 h-28" fill="none" stroke={fill} strokeWidth="20" />
          <path
            d="M110 120 L110 310 Q110 330 130 330 L270 330 Q290 330 290 310 L290 120 Z"
            fill={fill}
            stroke={EDGE}
            strokeWidth="1.5"
          />
          <ellipse cx="200" cy="120" rx="90" ry="14" fill={fill} stroke={EDGE} strokeWidth="1.5" />
          <ellipse cx="200" cy="121" rx="82" ry="10" fill="rgba(0,0,0,0.1)" />
        </>
      )}

      {shape === "tote" && (
        <>
          <path d="M140 140 C140 30 260 30 260 140" fill="none" stroke={EDGE} strokeWidth="14" />
          <path d="M140 140 C140 30 260 30 260 140" fill="none" stroke={fill} strokeWidth="10" />
          <path d="M80 140 L320 140 L335 385 L65 385 Z" fill={fill} stroke={EDGE} strokeWidth="1.5" />
        </>
      )}

      {shape === "poster" && (
        <rect x="60" y="30" width="280" height="360" fill={fill} stroke={EDGE} strokeWidth="1.5" />
      )}
    </svg>
  );
}