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
