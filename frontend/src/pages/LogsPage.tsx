import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getLogs } from "../services/api";

type LogItem = {
  name: string;
  size: number;
  modified: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [logs, setLogs] = useState<LogItem[]>([]);

  useEffect(() => {
    getLogs()
      .then((res) => {
        const payload = (res.data as { count?: number; logs?: LogItem[] }) || {};
        setCount(payload.count || 0);
        setLogs(payload.logs || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Logs</h3>
          <div className="chip-row">
            <span className="chip">files {count}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="table" rows={5} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && logs.length === 0 && <p className="muted">No log files found.</p>}
        {!loading && !error && logs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Modified</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.name}>
                    <td>{log.name}</td>
                    <td>{formatBytes(log.size)}</td>
                    <td>{new Date(log.modified * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
