import ProductSilhouette, { type Shape } from "@/components/product/ProductSilhouette";
import LayerView, { type LayerRender } from "@/components/product/LayerView";
import type { ViewKey } from "@/components/product/types";

export type PreviewZone = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: LayerRender;
};

// Read-only mockup of a product with its prints, used in the cart.
export default function PrintPreview({
  shape,
  view,
  fill,
  zones,
}: {
  shape: Shape;
  view: ViewKey;
  fill: string;
  zones: PreviewZone[];
}) {
  return (
    <div className="print-preview">
      <ProductSilhouette shape={shape} view={view} fill={fill} />
      {zones.map((z) => (
        <div
          key={z.id}
          className="preview-zone"
          style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
        >
          <div className="zone-clip">
            <LayerView layer={z.layer} />
          </div>
        </div>
      ))}
    </div>
  );
}
