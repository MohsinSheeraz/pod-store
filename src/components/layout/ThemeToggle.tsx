"use client";

// Light / dark switch. The theme lives on <html data-theme>; a tiny script in the layout sets it
// before first paint, so there is no flash. Both icons are always rendered and CSS shows the one
// for the current theme, which keeps server and client markup identical.
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.classList.add("theme-anim"); // fade colours for a moment instead of snapping
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    window.setTimeout(() => root.classList.remove("theme-anim"), 500);
  }

  return (
    <button
      type="button"
      className={`icon-btn theme-toggle ${className}`}
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      title="Switch theme"
    >
      <svg className="ti-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" />
        </g>
      </svg>
      <svg className="ti-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" fill="currentColor" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
        <circle cx="20.2" cy="9.8" r="0.7" fill="currentColor" />
      </svg>
    </button>
  );
}
