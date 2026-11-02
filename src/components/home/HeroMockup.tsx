"use client";

import { useState } from "react";

const COLORS = [
  { name: "Chalk", hex: "#F1F0EC", dark: false },
  { name: "Ink", hex: "#1B1D23", dark: true },
  { name: "Navy", hex: "#22305A", dark: true },
  { name: "Stone", hex: "#B9BDC6", dark: false },
  { name: "Sage", hex: "#9CB19A", dark: false },
];

const TEE =
  "M130 30 L90 45 L20 95 L55 150 L95 125 L95 385 Q95 395 105 395 L295 395 Q305 395 305 385 L305 125 L345 150 L380 95 L310 45 L270 30 Q250 60 200 60 Q150 60 130 30 Z";

export default function HeroMockup() {
  const [index, setIndex] = useState(0);
  const color = COLORS[index];

  const marks = color.dark ? "rgba(255,255,255,0.6)" : "rgba(20,22,27,0.5)";
  const art = color.dark
    ? { a: "#F2B84B", b: "#F1F0EC" }
    : { a: "#2547F5", b: "#14161B" };

  return (
    <div className="mockup">
      <div className="mockup-stage">
        <svg
          viewBox="0 0 400 420"
          role="img"
          aria-label={`Classic Tee in ${color.name} with a dashed print area on the chest`}
        >
          <path
            d={TEE}
            fill={color.hex}
            stroke="rgba(0,0,0,0.14)"
            strokeWidth="1.5"
            className="tee-fill"
          />
          <path
            d="M130 30 Q150 60 200 60 Q250 60 270 30"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="2"
          />

          <rect
            x="140"
            y="110"
            width="120"
            height="150"
            fill="none"
            stroke={marks}
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <path
            d="M128 110 H136 M140 98 V106 M264 110 H272 M260 98 V106 M128 260 H136 M140 264 V272 M264 260 H272 M260 264 V272"
            stroke={marks}
            strokeWidth="1.25"
            fill="none"
          />

          <circle cx="200" cy="165" r="28" fill={art.a} />
          <path
            d="M152 218 q12 -12 24 0 t24 0 t24 0 t24 0"
            fill="none"
            stroke={art.b}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M152 234 q12 -12 24 0 t24 0 t24 0 t24 0"
            fill="none"
            stroke={art.b}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="mockup-controls">
        <div className="swatches" role="group" aria-label="Shirt color">
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className="swatch"
              style={{ backgroundColor: c.hex }}
              aria-label={c.name}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <p className="mockup-caption" aria-live="polite">
          Classic Tee in {color.name}. The dashed area is where your design prints.
        </p>
      </div>
    </div>
  );
}
