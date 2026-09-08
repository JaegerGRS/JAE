import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getNodes } from "../services/api";

type NodeInfo = {
  id: string;
  hostname: string;
  status: string;
  cpu: string;
  ram_gb: number;
  gpu_count: number;
};

export function NodesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  useEffect(() => {
    getNodes()
      .then((res) => {
        const payload = (res.data as { nodes?: NodeInfo[] }) || {};
        setNodes(payload.nodes || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Nodes</h3>
          <div className="chip-row">
            <span className="chip">connected {nodes.length}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={2} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && (
          <div className="stat-grid">
            {nodes.map((node) => (
              <article key={node.id} className="stat-card">
                <p className="stat-label">{node.id}</p>
                <p className="stat-value">{node.status}</p>
                <p className="muted">{node.hostname}</p>
                <p className="muted">CPU: {node.cpu}</p>
                <p className="muted">RAM: {node.ram_gb} GB | GPUs: {node.gpu_count}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
