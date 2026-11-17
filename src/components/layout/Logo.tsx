import { SITE } from "@/lib/site";

// The brand mark: a tile with a "P" and a printing dot. Colours follow the theme (see .lm-*).
export default function Logo({ word = true }: { word?: boolean }) {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect className="lm-bg" width="32" height="32" rx="10" />
        <path className="lm-p" d="M11.5 24V8.5h5.9a4.6 4.6 0 0 1 0 9.2H14" />
        <circle className="lm-dot" cx="23.5" cy="23.5" r="2.6" />
      </svg>
      {word && <span className="logo-word">{SITE.name}</span>}
    </span>
  );
}
