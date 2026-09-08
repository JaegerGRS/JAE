import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import {
  cancelModelDownloadJob,
  deleteModel,
  getModelDownloadJob,
  getModelRecommendations,
  getModels,
  getModelStatus,
  listModelDownloadJobs,
  startModelDownload,
} from "../services/api";
import type { ModelInfo, TaskType } from "../types/api";

type StatusRow = {
  id: string;
  exists: boolean;
  size: number;
  checksum_ok: boolean | null;
};

export function ModelsPage() {
  const [taskType, setTaskType] = useState<TaskType>("GENERAL");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [statusRows, setStatusRows] = useState<Record<string, StatusRow>>({});
  const [compatibleModelIds, setCompatibleModelIds] = useState<string[]>([]);
  const [recommendedModelId, setRecommendedModelId] = useState<string>("");
  const [activeJob, setActiveJob] = useState<Record<string, unknown> | null>(null);
  const [jobRows, setJobRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  async function loadData(selectedTask: TaskType = taskType, silent = false) {
    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const [modelsRes, recommendationsRes, statusRes, jobsRes] = await Promise.all([
        getModels(),
        getModelRecommendations(selectedTask),
        getModelStatus(),
        listModelDownloadJobs(),
      ]);

      setModels((modelsRes.data.models as ModelInfo[]) || []);

      const compatible = (recommendationsRes.data.compatible_models || []).map((m) => m.id);
      setCompatibleModelIds(compatible);
      setRecommendedModelId(recommendationsRes.data.selected_model_id || "");

      const rows = ((statusRes.data.models as StatusRow[]) || []).reduce<Record<string, StatusRow>>((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {});
      setStatusRows(rows);

      const jobs = ((jobsRes.data.jobs as Array<Record<string, unknown>>) || [])
        .slice()
        .reverse()
        .slice(0, 200);
      setJobRows(jobs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh models data";
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadData(taskType);
  }, [taskType]);

  useEffect(() => {
    if (!activeJob) return;
    const id = String(activeJob.job_id || "");
    if (!id) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await getModelDownloadJob(id);
        const job = res.data.job;
        setActiveJob(job);
        const status = String(job.status || "");
        if (status === "completed" || status === "failed" || status === "cancelled") {
          window.clearInterval(timer);
          await loadData(taskType, true);
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [activeJob, taskType]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadData(taskType, true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [taskType]);

  async function onDownload(modelId: string) {
    try {
      setBusy(true);
      const res = await startModelDownload(modelId);
      setActiveJob(res.data.job);
      await loadData(taskType, true);
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!activeJob?.job_id) return;
    try {
      setBusy(true);
      const res = await cancelModelDownloadJob(String(activeJob.job_id));
      setActiveJob(res.data.job);
      await loadData(taskType, true);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(modelId: string) {
    try {
      setBusy(true);
      await deleteModel(modelId);
      await loadData(taskType, true);
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadCompatibleMissing() {
    const pendingDownloads = models
      .filter((m) => compatibleModelIds.includes(m.id) && !statusRows[m.id]?.exists)
      .map((m) => m.id);

    if (pendingDownloads.length === 0) {
      return;
    }

    let lastJob: Record<string, unknown> | null = null;
    try {
      setBusy(true);
      for (const modelId of pendingDownloads) {
        const res = await startModelDownload(modelId);
        lastJob = res.data.job;
      }
      setActiveJob(lastJob);
      await loadData(taskType, true);
    } finally {
      setBusy(false);
    }
  }

  const sortedModels = [...models].sort((a, b) => {
    const aCompatible = compatibleModelIds.includes(a.id) ? 1 : 0;
    const bCompatible = compatibleModelIds.includes(b.id) ? 1 : 0;
    if (aCompatible !== bCompatible) {
      return bCompatible - aCompatible;
    }
    return (a.priority ?? 100) - (b.priority ?? 100);
  });

  return (
    <section className="page">
      <div className="panel">
        <h3>Model Manifest</h3>
        <p className="muted">Download multiple local models. Auto-mode picks a best fit, but you can install and switch across several.</p>
        {loading && <LoadingSkeleton variant="table" rows={4} />}
        {error && <p className="muted">Refresh issue: {error}</p>}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
          <label>
            Task
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              style={{ marginLeft: "8px" }}
            >
              <option value="FAST">FAST</option>
              <option value="GENERAL">GENERAL</option>
              <option value="REASONING">REASONING</option>
              <option value="CODING">CODING</option>
              <option value="VISION">VISION</option>
              <option value="EMBEDDING">EMBEDDING</option>
            </select>
          </label>
          <button onClick={onDownloadCompatibleMissing} disabled={busy}>Download All Compatible Missing</button>
          <span className="muted">
            Compatible: {compatibleModelIds.length} | Recommended: {recommendedModelId || "none"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Params</th>
                <th>Quant</th>
                <th>Min RAM</th>
                <th>Min VRAM</th>
                <th>Capabilities</th>
                <th>Fit</th>
                <th>Local</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.parameter_count}</td>
                  <td>{m.quantization}</td>
                  <td>{m.required_ram_gb} GB</td>
                  <td>{m.required_vram_gb} GB</td>
                  <td>{m.capabilities.join(", ")}</td>
                  <td>
                    {compatibleModelIds.includes(m.id) ? "compatible" : "not-fit"}
                    {recommendedModelId === m.id ? " (recommended)" : ""}
                  </td>
                  <td>
                    {statusRows[m.id]?.exists ? "present" : "missing"}
                    {statusRows[m.id]?.checksum_ok === false ? " (bad hash)" : ""}
                  </td>
                  <td>
                    <button onClick={() => onDownload(m.id)} disabled={busy}>Download</button>
                    <button onClick={() => onDelete(m.id)} style={{ marginLeft: "8px" }} disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeJob && (
          <div style={{ marginTop: "12px" }}>
            <p>
              Job {String(activeJob.job_id)} | {String(activeJob.status)} | {String(activeJob.progress)}%
            </p>
            <button onClick={onCancel} disabled={busy}>Cancel Active Download</button>
          </div>
        )}

        <div style={{ marginTop: "16px" }}>
          <h4>Download Jobs</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {jobRows.map((job) => (
                  <tr key={String(job.job_id)}>
                    <td>{String(job.job_id).slice(0, 8)}</td>
                    <td>{String(job.model_id)}</td>
                    <td>{String(job.status)}</td>
                    <td>{String(job.progress)}%</td>
                    <td>{String(job.error || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
