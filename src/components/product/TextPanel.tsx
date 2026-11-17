"use client";

import type { RefObject } from "react";
import { FONT_KEYS, TEXT_COLORS, TEXT_FONTS, textLimit } from "@/lib/placement";
import type { FontKey, TextLayer, TextStyle, ZoneDTO } from "@/components/product/types";

type Props = {
  zone: ZoneDTO;
  layer: TextLayer | undefined;
  inputRef: RefObject<HTMLInputElement | null>;
  onText: (value: string) => void;
  onPatch: (patch: { font?: FontKey; color?: string; style?: Partial<TextStyle> }) => void;
};

const ARCH_DEFAULT = 45;

// Type text, pick a font, color and style, and bend it into an arch. Every change shows on the
// product straight away.
export default function TextPanel({ zone, layer, inputRef, onText, onPatch }: Props) {
  const limit = textLimit(zone);
  const curve = layer?.style.curve ?? 0;
  const arch = curve > 0 ? "up" : curve < 0 ? "down" : "none";

  return (
    <div className="text-panel">
      <input
        ref={inputRef}
        className="text-input"
        type="text"
        maxLength={limit}
        placeholder={zone.kind === "TEXT" ? "Initials, up to 6 characters" : `Your text (up to ${limit} characters)`}
        aria-label={`${zone.label} text`}
        value={layer?.text ?? ""}
        onChange={(e) => onText(e.target.value)}
      />

      {layer && (
        <>
          <div className="font-grid" role="group" aria-label="Font">
            {FONT_KEYS.map((f) => (
              <button
                key={f}
                type="button"
                className="font-item"
                aria-pressed={layer.font === f}
                onClick={() => onPatch({ font: f })}
                title={TEXT_FONTS[f].label}
              >
                <span style={{ fontFamily: TEXT_FONTS[f].css }}>Aa</span>
                <small>{TEXT_FONTS[f].label}</small>
              </button>
            ))}
          </div>

          <div className="text-row">
            <div className="chips" role="group" aria-label="Style">
              <button
                type="button"
                className="chip style-b"
                aria-pressed={layer.style.bold}
                onClick={() => onPatch({ style: { bold: !layer.style.bold } })}
              >
                B
              </button>
              <button
                type="button"
                className="chip style-i"
                aria-pressed={layer.style.italic}
                onClick={() => onPatch({ style: { italic: !layer.style.italic } })}
              >
                I
              </button>
            </div>
            <div className="chips" role="group" aria-label="Curve">
              {(
                [
                  ["none", "Straight", 0],
                  ["up", "Arch up", ARCH_DEFAULT],
                  ["down", "Arch down", -ARCH_DEFAULT],
                ] as const
              ).map(([key, label, value]) => (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  aria-pressed={arch === key}
                  onClick={() => onPatch({ style: { curve: value } })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {arch !== "none" && (
            <label className="slider">
              <span>
                Curve <output>{Math.abs(curve)}%</output>
              </span>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={Math.abs(curve)}
                onChange={(e) =>
                  onPatch({ style: { curve: (curve < 0 ? -1 : 1) * Number(e.target.value) } })
                }
              />
            </label>
          )}

          <div className="swatches" role="group" aria-label="Text color">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                style={{ backgroundColor: c }}
                aria-label={`Text color ${c}`}
                aria-pressed={layer.color.toLowerCase() === c.toLowerCase()}
                onClick={() => onPatch({ color: c })}
              />
            ))}
            <label className="swatch swatch-custom" title="Custom color">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => onPatch({ color: e.target.value.toUpperCase() })}
                aria-label="Custom text color"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
