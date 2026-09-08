import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { getSupporters } from "../services/api";

type Supporter = {
  github_username: string;
  display_name?: string;
  tier?: string;
  note?: string;
  github_url: string;
  avatar_url: string;
};

type SupportersData = {
  source: string;
  support_url: string;
  description: string;
  members: Supporter[];
};

export function SupportersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<SupportersData | null>(null);

  useEffect(() => {
    getSupporters()
      .then((res) => setData((res.data as SupportersData) || null))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Supporters</h3>
          <div className="chip-row">
            <span className="chip">{data?.source || "supporters"}</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}
        {error && <p className="muted">Failed to load supporters: {error}</p>}
        {!loading && !error && data && (
          <>
            <p className="muted">{data.description}</p>
            <p>
              Support link: <a className="inline-link" href={data.support_url} target="_blank" rel="noreferrer">{data.support_url}</a>
            </p>
            {data.members.length === 0 ? (
              <div className="supporters-empty">
                <h4>No public supporters yet</h4>
                <p className="muted">Add GitHub usernames for Ko-fi supporters in config/supporters.json and they will appear here with their GitHub profile.</p>
              </div>
            ) : (
              <div className="supporters-grid">
                {data.members.map((member) => (
                  <article key={member.github_username} className="supporter-card">
                    <img src={member.avatar_url} alt={member.github_username} className="supporter-avatar" />
                    <div>
                      <h4>{member.display_name || member.github_username}</h4>
                      <p className="muted">@{member.github_username}</p>
                      {member.tier ? <p className="supporter-meta">Tier: {member.tier}</p> : null}
                      {member.note ? <p className="supporter-meta">{member.note}</p> : null}
                      <a className="inline-link" href={member.github_url} target="_blank" rel="noreferrer">View GitHub</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
