import type { CSSProperties } from "react";
import { TEXT_BASE_CQW, TEXT_FONTS } from "@/lib/placement";
import type { FontKey, Placement } from "@/components/product/types";

// Everything needed to draw one print layer, on the editor canvas or in the cart.
export type LayerRender =
  | { kind: "image"; imageUrl: string; placement: Placement }
  | { kind: "text"; text: string; font: FontKey; color: string; placement: Placement };

function positionStyle(p: Placement): CSSProperties {
  return {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
  };
}

// Must sit inside an element with container-type: inline-size (.zone-clip / .zone-ghost),
// because sizes are relative to the print area's width.
export default function LayerView({
  layer,
  innerRef,
}: {
  layer: LayerRender;
  innerRef?: (el: HTMLElement | null) => void;
}) {
  if (layer.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={innerRef}
        src={layer.imageUrl}
        alt=""
        draggable={false}
        style={{
          ...positionStyle(layer.placement),
          width: `${layer.placement.scale * 100}%`,
          maxWidth: "none",
          height: "auto",
          display: "block",
        }}
      />
    );
  }

  return (
    <span
      ref={innerRef}
      style={{
        ...positionStyle(layer.placement),
        fontFamily: TEXT_FONTS[layer.font]?.css ?? TEXT_FONTS.sans.css,
        fontSize: `${layer.placement.scale * TEXT_BASE_CQW}cqw`,
        color: layer.color,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {layer.text}
    </span>
  );
}
