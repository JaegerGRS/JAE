import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getAgents } from "../services/api";

export function AgentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    getAgents()
      .then((res) => {
        const payload = (res.data as { items?: string[] }) || {};
        setItems(payload.items || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Agents</h3>
          <div className="chip-row">
            <span className="chip">count {items.length}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="list" rows={4} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && items.length === 0 && <p className="muted">No agents found.</p>}
        {!loading && !error && items.length > 0 && (
          <ul className="name-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
