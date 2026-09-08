import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getMemorySummary } from "../services/api";

export function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    getMemorySummary()
      .then((res) => {
        const payload = (res.data as { total?: number; active?: number }) || {};
        setTotal(payload.total || 0);
        setActive(payload.active || 0);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Memory</h3>
          <div className="chip-row">
            <span className="chip">local store</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && (
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">Total Entries</p>
              <p className="stat-value">{total}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Active Entries</p>
              <p className="stat-value">{active}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Archived Entries</p>
              <p className="stat-value">{Math.max(total - active, 0)}</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
