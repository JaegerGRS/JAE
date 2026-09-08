import { useEffect, useState } from "react";
import { getSystem } from "../services/api";

export function SystemPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getSystem().then((res) => setData(res.data)).catch(() => setData(null));
  }, []);

  const hardware = (data?.hardware as Record<string, unknown>) || {};
  const cpu = (hardware.cpu as Record<string, unknown>) || {};
  const gpus = (hardware.gpus as Array<Record<string, unknown>>) || [];
  const tier = (data?.tier as Record<string, unknown>) || {};

  return (
    <section className="page grid-page">
      <div className="panel">
        <h3>Hardware</h3>
        <p>CPU: {String(cpu.model || "unknown")}</p>
        <p>Cores/Threads: {String(cpu.cores || "0")}/{String(cpu.threads || "0")}</p>
        <p>RAM (GB): {String(hardware.total_ram_gb || "0")}</p>
      </div>
      <div className="panel">
        <h3>GPU</h3>
        {gpus.length === 0 ? (
          <p>No discrete GPU detected</p>
        ) : (
          gpus.map((g, idx) => (
            <p key={idx}>
              {String(g.vendor)} {String(g.model)} ({String(g.vram_gb)} GB)
            </p>
          ))
        )}
      </div>
      <div className="panel">
        <h3>Runtime</h3>
        <p>Tier: {String(tier.name || "unknown")}</p>
        <p>Backend: {String(data?.inference_backend || "unknown")}</p>
        <p>Node: {String(data?.node_id || "unknown")}</p>
      </div>
    </section>
  );
}
