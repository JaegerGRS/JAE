import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getUpdates } from "../services/api";

type UpdatesData = {
  current_version: string;
  channel: string;
  policy: string;
  update_available: boolean;
};

export function UpdatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<UpdatesData | null>(null);

  useEffect(() => {
    getUpdates()
      .then((res) => setData((res.data as UpdatesData) || null))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Updates</h3>
          <div className="chip-row">
            <span className="chip">channel {data?.channel || "-"}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && data && (
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">Current Version</p>
              <p className="stat-value">{data.current_version}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Policy</p>
              <p className="stat-value">{data.policy}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Availability</p>
              <p className="stat-value">{data.update_available ? "Update Ready" : "Up to Date"}</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
