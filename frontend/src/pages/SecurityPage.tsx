import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getSecurity } from "../services/api";

type SecurityData = {
  localhost_only: boolean;
  auth_mode: string;
  backup_encryption: boolean;
  notes: string;
};

export function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<SecurityData | null>(null);

  useEffect(() => {
    getSecurity()
      .then((res) => setData((res.data as SecurityData) || null))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Security</h3>
          <div className="chip-row">
            <span className="chip">local first</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && data && (
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">Network Binding</p>
              <p className="stat-value">{data.localhost_only ? "Localhost Only" : "Network Exposed"}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Authentication</p>
              <p className="stat-value">{data.auth_mode}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Backup Encryption</p>
              <p className="stat-value">{data.backup_encryption ? "Enabled" : "Disabled"}</p>
            </article>
          </div>
        )}
        {data?.notes && <p className="muted" style={{ marginTop: "12px" }}>{data.notes}</p>}
      </div>
    </section>
  );
}
