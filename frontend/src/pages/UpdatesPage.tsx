import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getUpdates } from "../services/api";

type UpdatesData = {
  current_version: string;
  channel: string;
  auto_update_policy: string;
  auto_update_reference: string;
  auto_updates?: Array<{
    name: string;
    description: string;
    reference: string;
    status: string;
  }>;
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
          <h3>Auto Updates</h3>
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
              <p className="stat-label">Auto Update Policy</p>
              <p className="stat-value">{data.auto_update_policy}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Update Availability</p>
              <p className="stat-value">{data.update_available ? "Update Ready" : "Up to Date"}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Reference</p>
              <p className="stat-value">{data.auto_update_reference}</p>
            </article>
          </div>
        )}
        {!loading && !error && data?.auto_updates?.length ? (
          <div className="panel" style={{ marginTop: "12px" }}>
            <h3 style={{ marginTop: 0 }}>Auto Update References</h3>
            <ul className="name-list">
              {data.auto_updates.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>
                  <p className="muted" style={{ margin: "6px 0" }}>{item.description}</p>
                  <p style={{ margin: 0 }}>Reference: {item.reference} | Status: {item.status}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
