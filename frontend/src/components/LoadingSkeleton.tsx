type LoadingSkeletonProps = {
  variant?: "cards" | "list" | "table";
  rows?: number;
};

export function LoadingSkeleton({ variant = "cards", rows = 3 }: LoadingSkeletonProps) {
  if (variant === "list") {
    return (
      <div className="loading-shell" aria-live="polite" aria-busy="true">
        <ul className="name-list">
          {Array.from({ length: rows }).map((_, idx) => (
            <li key={idx}>
              <div className="skeleton-line" style={{ width: `${68 - idx * 8}%` }} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="loading-shell" aria-live="polite" aria-busy="true">
        <div className="skeleton-table">
          {Array.from({ length: rows }).map((_, idx) => (
            <div key={idx} className="skeleton-row">
              <div className="skeleton-line" style={{ width: "22%" }} />
              <div className="skeleton-line" style={{ width: "36%" }} />
              <div className="skeleton-line" style={{ width: "18%" }} />
              <div className="skeleton-line" style={{ width: "20%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-shell" aria-live="polite" aria-busy="true">
      <div className="stat-grid">
        {Array.from({ length: rows }).map((_, idx) => (
          <article key={idx} className="stat-card">
            <div className="skeleton-line" style={{ width: "40%", marginBottom: "10px" }} />
            <div className="skeleton-line skeleton-line-large" style={{ width: `${48 + idx * 12}%` }} />
            <div className="skeleton-line" style={{ width: "58%", marginTop: "10px" }} />
          </article>
        ))}
      </div>
    </div>
  );
}
