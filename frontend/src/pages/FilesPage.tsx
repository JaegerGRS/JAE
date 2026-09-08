import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getFiles } from "../services/api";

type FileEntry = {
  name: string;
  type: "dir" | "file";
  size: number;
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

export function FilesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [root, setRoot] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);

  useEffect(() => {
    getFiles()
      .then((res) => {
        const payload = (res.data as { root?: string; entries?: FileEntry[] }) || {};
        setRoot(payload.root || "");
        setEntries(payload.entries || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Files</h3>
          <div className="chip-row">
            <span className="chip">entries {entries.length}</span>
          </div>
        </div>
        {root && <p className="muted">Workspace root: {root}</p>}
        {loading && <LoadingSkeleton variant="table" rows={5} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && entries.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.type}-${entry.name}`}>
                    <td>{entry.name}</td>
                    <td>
                      <span className={`badge ${entry.type === "dir" ? "badge-dir" : "badge-file"}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td>{entry.type === "file" ? formatBytes(entry.size) : "-"}</td>
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
