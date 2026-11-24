// Shown instantly while a shop page loads, so navigation never flashes blank.
export default function Loading() {
  return (
    <div className="container loading-page" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
