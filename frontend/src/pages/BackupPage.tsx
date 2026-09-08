import { useEffect, useState } from "react";
import {
  createBackup,
  exportBackup,
  listBackups,
  preflightBackupRestore,
  restoreBackup,
  verifyBackup,
} from "../services/api";

type BackupRow = { name: string; size: number; modified: string };

export function BackupPage() {
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("idle");
  const [planHash, setPlanHash] = useState("");
  const [planSummary, setPlanSummary] = useState("");
  const [exportSubdir, setExportSubdir] = useState("node-mirror");

  async function loadRows() {
    const res = await listBackups();
    const backups = (res.data.backups as BackupRow[]) || [];
    setRows(backups);
    if (!selected && backups.length > 0) {
      setSelected(backups[0].name);
    }
  }

  useEffect(() => {
    loadRows().catch(() => setRows([]));
  }, []);

  async function onCreate() {
    setStatus("creating backup...");
    await createBackup();
    await loadRows();
    setStatus("backup created");
  }

  async function onVerify() {
    if (!selected) return;
    setStatus("verifying backup...");
    const res = await verifyBackup(selected);
    setStatus(String(res.data.message || "verify complete"));
  }

  async function onRestore() {
    if (!selected) return;
    if (!planHash) {
      setStatus("run preflight before restore");
      return;
    }
    setStatus("restoring backup...");
    const res = await restoreBackup(selected, planHash);
    setStatus(`restore complete (${String(res.data.restore_id || "no-id")})`);
  }

  async function onPreflight() {
    if (!selected) return;
    setStatus("building restore plan...");
    const res = await preflightBackupRestore(selected);
    const counts = (res.data.counts as Record<string, number>) || {};
    const hash = String(res.data.plan_hash || "");
    setPlanHash(hash);
    setPlanSummary(
      `create=${counts.create || 0}, update=${counts.update || 0}, unchanged=${counts.unchanged || 0}`
    );
    setStatus("preflight ready");
  }

  async function onExport() {
    if (!selected) return;
    setStatus("exporting backup...");
    const res = await exportBackup(selected, exportSubdir);
    setStatus(`exported to ${String(res.data.exported_backup || "target")}`);
  }

  return (
    <section className="page grid-page">
      <div className="panel">
        <h3>Backup</h3>
        <p>Encrypted local backups are enabled.</p>
        <button onClick={onCreate}>Backup Now</button>
      </div>
      <div className="panel">
        <h3>Restore</h3>
        <p>Select a backup and run verify or restore.</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select backup</option>
          {rows.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button onClick={onVerify} disabled={!selected}>Verify</button>
          <button onClick={onPreflight} disabled={!selected}>Preflight</button>
          <button onClick={onRestore} disabled={!selected}>Restore</button>
        </div>
        <div style={{ marginTop: "12px" }}>
          <label htmlFor="exportSubdir">Export Target</label>
          <input
            id="exportSubdir"
            value={exportSubdir}
            onChange={(e) => setExportSubdir(e.target.value)}
            placeholder="node-mirror"
            style={{ display: "block", marginTop: "6px", width: "100%" }}
          />
          <button onClick={onExport} disabled={!selected} style={{ marginTop: "8px" }}>
            Export Encrypted Backup
          </button>
        </div>
        <p className="muted">Plan: {planSummary || "not generated"}</p>
        <p className="muted">Plan Hash: {planHash || "none"}</p>
        <p className="muted">{status}</p>
      </div>
      <div className="panel" style={{ gridColumn: "1 / -1" }}>
        <h3>Backup History</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.size}</td>
                  <td>{r.modified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
