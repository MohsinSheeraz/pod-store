import Link from "next/link";
import ProductSilhouette, { ProductShade, shapeFor, type Shape } from "@/components/product/ProductSilhouette";
import { formatMoney } from "@/lib/format";

// Each tile shows the real mockup with a design on it, in a colour of its own.
const LOOKS: Record<Shape, { fill: string; design: string; x: number; y: number; w: number }> = {
  tee: { fill: "#ced4da", design: "/designs/good-vibes.svg", x: 50, y: 41, w: 28 },
  hoodie: { fill: "#1f2e4a", design: "/designs/bold-star.svg", x: 50, y: 43, w: 26 },
  mug: { fill: "#f8f9fa", design: "/designs/mountain-badge.svg", x: 50, y: 52, w: 26 },
  tote: { fill: "#343a40", design: "/designs/retro-stripes.svg", x: 50, y: 62, w: 34 },
  poster: { fill: "#f8f9fa", design: "/designs/sunset-wave.svg", x: 50, y: 50, w: 52 },
};

type Props = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  price: number;
};

export default function ProductTile({ slug, name, categorySlug, categoryName, price }: Props) {
  const shape = shapeFor(slug, categorySlug);
  const look = LOOKS[shape];

  return (
    <Link href={`/products/${slug}`} className="product-tile">
      <div className="tile-art">
        <span className="tile-tag">{categoryName}</span>
        <div className="tile-stage">
          <ProductSilhouette shape={shape} view="front" fill={look.fill} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="tile-design"
            src={look.design}
            alt=""
            style={{ left: `${look.x}%`, top: `${look.y}%`, width: `${look.w}%` }}
          />
          <ProductShade shape={shape} view="front" />
        </div>
      </div>
      <div className="tile-body">
        <h3>{name}</h3>
        <p>From {formatMoney(price)} · Customize →</p>
      </div>
    </Link>
  );
}
