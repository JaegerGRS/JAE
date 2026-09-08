import type { ApiResponse, ChatMessage, ModelRecommendations, StorageMoveResult, StorageStatus, SupportersResponse, TaskType } from "../types/api";

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : "http://127.0.0.1:8000/api/v1").replace(/\/+$/, "");

async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await res.json()) as { detail?: string; error?: string; message?: string };
    return payload.detail || payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}

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

export async function getStorageStatus() {
  const res = await fetch(`${API_BASE}/storage`);
  return (await res.json()) as ApiResponse<StorageStatus>;
}

export async function moveStorage(targetMode: "portable" | "native", driveRoot?: string) {
  const res = await fetch(`${API_BASE}/storage/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_mode: targetMode, drive_root: driveRoot ?? null }),
  });
  if (!res.ok) {
    const message = await getErrorMessage(res, `Storage move failed: ${res.status}`);
    throw new Error(message);
  }
  return (await res.json()) as ApiResponse<StorageMoveResult>;
}

export async function getSupporters() {
  const res = await fetch(`${API_BASE}/supporters`);
  return (await res.json()) as ApiResponse<SupportersResponse>;
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
  if (!res.ok) {
    const message = await getErrorMessage(res, `Conversation start failed: ${res.status}`);
    throw new Error(message);
  }
  return (await res.json()) as ApiResponse<{ conversation_id: number }>;
}

export async function chatOnce(payload: { conversation_id?: number; messages: ChatMessage[]; task_type?: string; model_id?: string }) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await getErrorMessage(res, `Chat request failed: ${res.status}`);
    throw new Error(message);
  }
  return (await res.json()) as ApiResponse<{ conversation_id: number; model_id: string; response: string }>;
}

export function streamChat(
  payload: { conversation_id?: number; messages: ChatMessage[]; task_type?: string; model_id?: string },
  handlers: {
    onToken: (token: string) => void;
    onDone: (doneData: { conversation_id: number; model_id: string }) => void;
    onError: (error: string) => void;
  }
) {
  const controller = new AbortController();
  const timeoutMs = 30000;
  let timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

  const resetTimeout = () => {
    window.clearTimeout(timeoutHandle);
    timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);
  };

  fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        window.clearTimeout(timeoutHandle);
        const message = await getErrorMessage(res, `Streaming failed: ${res.status}`);
        handlers.onError(message);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        resetTimeout();
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
            doneReceived = true;
            window.clearTimeout(timeoutHandle);
            handlers.onDone(parsed);
          }
          if (eventName === "error") {
            const parsed = JSON.parse(data) as { error?: string };
            window.clearTimeout(timeoutHandle);
            handlers.onError(parsed.error || "Streaming failed");
            return;
          }
        }
      }

      if (!doneReceived) {
        window.clearTimeout(timeoutHandle);
        handlers.onError("Stream ended unexpectedly");
      }
    })
    .catch((err: Error) => {
      window.clearTimeout(timeoutHandle);
      if (err.name === "AbortError") {
        handlers.onError("Stream timed out");
        return;
      }
      handlers.onError(err.message);
    });
}
