// The editor's layout (sidebar and canvas) as grey shapes while the product loads.
export default function Loading() {
  return (
    <div className="editor-shell" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading the editor…</span>
      <aside className="editor-sidebar">
        <div className="sidebar-head">
          <div className="skeleton skeleton-line" style={{ width: 90 }} />
        </div>
        <div className="sidebar-body editor-panel">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton-grid skeleton-grid-sm">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-chip" />
            ))}
          </div>
          <div className="skeleton skeleton-block" />
        </div>
      </aside>
      <section className="editor-canvas">
        <div className="canvas-bar" />
        <div className="stage-wrap">
          <div className="skeleton skeleton-stage" />
        </div>
      </section>
    </div>
  );
}
