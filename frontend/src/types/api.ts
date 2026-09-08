export type ApiResponse<T> = {
  ok: boolean;
  message: string;
  data: T;
};

export type ChatMessage = {
  role: string;
  content: string;
};

export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  source: string;
  parameter_count: string;
  quantization: string;
  required_ram_gb: number;
  recommended_ram_gb: number;
  required_vram_gb: number;
  recommended_vram_gb: number;
  capabilities: string[];
  priority: number;
};

export type TaskType = "FAST" | "GENERAL" | "REASONING" | "CODING" | "VISION" | "EMBEDDING";

export type ModelRecommendations = {
  task_type: TaskType;
  selected_model_id: string;
  reason: string;
  tier: string;
  hardware: {
    total_ram_gb: number;
    max_vram_gb: number;
  };
  compatible_models: ModelInfo[];
};

export type SupporterInfo = {
  github_username: string;
  display_name?: string;
  tier?: string;
  note?: string;
  github_url: string;
  avatar_url: string;
};

export type SupportersResponse = {
  source: string;
  support_url: string;
  description: string;
  members: SupporterInfo[];
};

export type StorageDriveInfo = {
  drive_root: string;
  portable_root: string;
  device: string;
  removable: boolean;
  marker_present: boolean;
};

export type StorageStatus = {
  current_root: string;
  current_mode: string;
  database_path: string;
  portable_drives: StorageDriveInfo[];
  native_root: string;
  portable_container: string;
  restart_required: boolean;
  performance_hint: string;
};

export type StorageMoveResult = {
  target_root: string;
  target_mode: string;
  database_path: string;
  restart_required: boolean;
  message: string;
};
