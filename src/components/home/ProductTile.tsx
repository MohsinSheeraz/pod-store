import Link from "next/link";
import ProductSilhouette, { ProductShade, shapeFor } from "@/components/product/ProductSilhouette";
import { formatMoney } from "@/lib/format";
import { LOOKS } from "@/components/product/sample-looks";

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
