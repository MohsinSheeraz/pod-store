"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { TEXT_BASE_CQW, TEXT_FONTS } from "@/lib/placement";
import { curveGeometry, ensureFont, measureText, textWeight } from "@/lib/text-metrics";
import type { FontKey, Placement, TextStyle } from "@/components/product/types";

// Everything needed to draw one print layer, on the editor canvas, in the cart or on an order.
export type LayerRender =
  | { kind: "image"; imageUrl: string; placement: Placement }
  | {
      kind: "text";
      text: string;
      font: FontKey;
      color: string;
      style: TextStyle;
      placement: Placement;
    };

function positionStyle(p: Placement): CSSProperties {
  return {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
  };
}

// Text width at a 100px font. Starts as an estimate and is corrected once the font loads.
function useTextWidth(text: string, font: FontKey, bold: boolean, italic: boolean) {
  const [width, setWidth] = useState(() => text.length * 55);
  useEffect(() => {
    let live = true;
    void ensureFont(font, bold, italic, text).then(() => {
      if (live) setWidth(measureText(text, font, bold, italic));
    });
    return () => {
      live = false;
    };
  }, [text, font, bold, italic]);
  return width;
}

function TextLayerView({
  layer,
  innerRef,
}: {
  layer: Extract<LayerRender, { kind: "text" }>;
  innerRef?: (el: HTMLElement | null) => void;
}) {
  const { text, font, color, style, placement } = layer;
  const id = useId();
  const len = useTextWidth(text, font, style.bold, style.italic);
  const fontCqw = placement.scale * TEXT_BASE_CQW;
  const family = TEXT_FONTS[font]?.css ?? TEXT_FONTS.sans.css;
  const weight = textWeight(style.bold);
  const fontStyle = style.italic ? "italic" : "normal";

  if (!style.curve) {
    return (
      <span
        ref={innerRef}
        style={{
          ...positionStyle(placement),
          fontFamily: family,
          fontSize: `${fontCqw}cqw`,
          fontWeight: weight,
          fontStyle,
          color,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    );
  }

  const g = curveGeometry(len, style.curve);
  const widthCqw = (g.box.w * fontCqw) / 100;
  return (
    <span ref={innerRef} style={{ ...positionStyle(placement), display: "block", width: `${widthCqw}cqw` }}>
      <svg
        viewBox={`${g.box.x} ${g.box.y} ${g.box.w} ${g.box.h}`}
        style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
        aria-label={text}
      >
        <path id={`${id}-p`} d={g.d} fill="none" />
        <text
          fill={color}
          fontSize="100"
          fontWeight={weight}
          fontStyle={fontStyle}
          style={{ fontFamily: family }}
        >
          <textPath href={`#${id}-p`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </svg>
    </span>
  );
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
  return <TextLayerView layer={layer} innerRef={innerRef} />;
}
