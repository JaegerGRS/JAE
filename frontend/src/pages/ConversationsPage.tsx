import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getConversations } from "../services/api";

type ConversationItem = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export function ConversationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<ConversationItem[]>([]);

  useEffect(() => {
    getConversations()
      .then((res) => {
        const payload = (res.data as { count?: number; items?: ConversationItem[] }) || {};
        setCount(payload.count || 0);
        setItems(payload.items || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Conversations</h3>
          <div className="chip-row">
            <span className="chip">total {count}</span>
            <span className="chip">recent 100</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="table" rows={5} />}
        {error && <p className="muted">Failed to load: {error}</p>}
        {!loading && !error && items.length === 0 && <p className="muted">No conversations yet.</p>}
        {!loading && !error && items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Updated</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
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
