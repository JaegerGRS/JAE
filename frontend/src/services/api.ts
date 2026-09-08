import type { ApiResponse, ChatMessage, ModelRecommendations, TaskType } from "../types/api";

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getSystem() {
  const res = await fetch(`${API_BASE}/system`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getVersion() {
  const res = await fetch(`${API_BASE}/version`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getConversations() {
  const res = await fetch(`${API_BASE}/conversations`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getMemorySummary() {
  const res = await fetch(`${API_BASE}/memory`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getNodes() {
  const res = await fetch(`${API_BASE}/nodes`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getTools() {
  const res = await fetch(`${API_BASE}/tools`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getSkills() {
  const res = await fetch(`${API_BASE}/skills`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getFiles() {
  const res = await fetch(`${API_BASE}/files`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getUpdates() {
  const res = await fetch(`${API_BASE}/updates`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getLogs() {
  const res = await fetch(`${API_BASE}/logs`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getSecurity() {
  const res = await fetch(`${API_BASE}/security`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getModels() {
  const res = await fetch(`${API_BASE}/models`);
  return (await res.json()) as ApiResponse<{ models: unknown[] }>;
}

export async function getModelRecommendations(taskType: TaskType) {
  const res = await fetch(`${API_BASE}/models/recommendations?task_type=${encodeURIComponent(taskType)}`);
  return (await res.json()) as ApiResponse<ModelRecommendations>;
}

export async function getModelStatus() {
  const res = await fetch(`${API_BASE}/models/status`);
  return (await res.json()) as ApiResponse<{ models: unknown[] }>;
}

export async function listModelDownloadJobs() {
  const res = await fetch(`${API_BASE}/models/downloads`);
  return (await res.json()) as ApiResponse<{ jobs: unknown[] }>;
}

export async function startModelDownload(modelId: string) {
  const res = await fetch(`${API_BASE}/models/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: modelId }),
  });
  return (await res.json()) as ApiResponse<{ job: Record<string, unknown> }>;
}

export async function getModelDownloadJob(jobId: string) {
  const res = await fetch(`${API_BASE}/models/download/${jobId}`);
  return (await res.json()) as ApiResponse<{ job: Record<string, unknown> }>;
}

export async function cancelModelDownloadJob(jobId: string) {
  const res = await fetch(`${API_BASE}/models/download/${jobId}/cancel`, { method: "POST" });
  return (await res.json()) as ApiResponse<{ job: Record<string, unknown> }>;
}

export async function deleteModel(modelId: string) {
  const res = await fetch(`${API_BASE}/models/${modelId}`, { method: "DELETE" });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function getSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function listBackups() {
  const res = await fetch(`${API_BASE}/backups`);
  return (await res.json()) as ApiResponse<{ backups: Array<Record<string, unknown>> }>;
}

export async function createBackup(backupName?: string) {
  const res = await fetch(`${API_BASE}/backups/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup_name: backupName ?? null }),
  });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function verifyBackup(backupName: string) {
  const res = await fetch(`${API_BASE}/backups/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup_name: backupName }),
  });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function preflightBackupRestore(backupName: string) {
  const res = await fetch(`${API_BASE}/backups/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup_name: backupName }),
  });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function restoreBackup(backupName: string, expectedPlanHash?: string) {
  const res = await fetch(`${API_BASE}/backups/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup_name: backupName, expected_plan_hash: expectedPlanHash ?? null }),
  });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function exportBackup(backupName: string, destinationSubdir?: string) {
  const res = await fetch(`${API_BASE}/backups/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup_name: backupName, destination_subdir: destinationSubdir ?? null }),
  });
  return (await res.json()) as ApiResponse<Record<string, unknown>>;
}

export async function createConversation() {
  const res = await fetch(`${API_BASE}/chat/create`, { method: "POST" });
  return (await res.json()) as ApiResponse<{ conversation_id: number }>;
}

export function streamChat(
  payload: { conversation_id?: number; messages: ChatMessage[]; task_type?: string; model_id?: string },
  handlers: {
    onToken: (token: string) => void;
    onDone: (doneData: { conversation_id: number; model_id: string }) => void;
    onError: (error: string) => void;
  }
) {
  fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        handlers.onError(`Streaming failed: ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const lines = evt.split("\n");
          const eventName = lines.find((l) => l.startsWith("event:"))?.replace("event:", "").trim();
          const data = lines.find((l) => l.startsWith("data:"))?.replace("data:", "").trim();
          if (!eventName || !data) {
            continue;
          }
          if (eventName === "token") {
            const parsed = JSON.parse(data) as { token: string };
            handlers.onToken(parsed.token);
          }
          if (eventName === "done") {
            const parsed = JSON.parse(data) as { conversation_id: number; model_id: string };
            handlers.onDone(parsed);
          }
        }
      }
    })
    .catch((err: Error) => handlers.onError(err.message));
}
