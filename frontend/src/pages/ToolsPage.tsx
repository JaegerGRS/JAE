import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getTools } from "../services/api";

type ToolItem = {
  id: string;
  name: string;
  permissions: string[];
  enabled: boolean;
};

export function ToolsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tools, setTools] = useState<ToolItem[]>([]);

  useEffect(() => {
    getTools()
      .then((res) => {
        const payload = (res.data as { tools?: ToolItem[] }) || {};
        setTools(payload.tools || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Tools</h3>
          <div className="chip-row">
            <span className="chip">registered {tools.length}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && (
          <div className="stat-grid">
            {tools.map((tool) => (
              <article key={tool.id} className="stat-card">
                <p className="stat-label">{tool.id}</p>
                <p className="stat-value">{tool.name}</p>
                <p>
                  <span className={`badge ${tool.enabled ? "badge-on" : "badge-off"}`}>
                    {tool.enabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
                <p className="muted">Permissions: {tool.permissions.join(", ")}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
