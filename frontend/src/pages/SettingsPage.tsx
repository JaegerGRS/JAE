import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useUiSettings } from "../lib/uiSettings";
import { getModels, getModelStatus, getSettings } from "../services/api";
import type { ModelInfo, TaskType } from "../types/api";

export function SettingsPage() {
  const { settings: uiSettings, updateSettings } = useUiSettings();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [localModelIds, setLocalModelIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getSettings(), getModels(), getModelStatus()])
      .then(([settingsRes, modelsRes, statusRes]) => {
        setSettings(settingsRes.data);
        setModels((modelsRes.data.models as ModelInfo[]) || []);
        const local = ((statusRes.data.models as Array<{ id: string; exists: boolean }>) || [])
          .filter((m) => m.exists)
          .map((m) => m.id);
        setLocalModelIds(local);
      })
      .catch(() => {
        setSettings({});
        setModels([]);
        setLocalModelIds([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const localModels = models.filter((m) => localModelIds.includes(m.id));

  return (
    <section className="page">
      <div className="panel">
        <div className="panel-header">
          <h3>Settings Hub</h3>
          <div className="chip-row">
            <span className="chip">central controls</span>
          </div>
        </div>
        {loading && <LoadingSkeleton variant="cards" rows={3} />}

        {!loading && (
          <div className="settings-grid">
            <article className="settings-card">
              <h4>Interface</h4>
              <label className="settings-line">
                <span>Show Advanced Navigation</span>
                <input
                  type="checkbox"
                  checked={uiSettings.showAdvancedNavigation}
                  onChange={(e) => updateSettings({ showAdvancedNavigation: e.target.checked })}
                />
              </label>
              <p className="muted" style={{ margin: "0 0 10px" }}>
                Advanced sections in the sidebar are only controlled from this Settings page.
              </p>
              <label className="settings-line">
                <span>Show Model Picker On Chat</span>
                <input
                  type="checkbox"
                  checked={uiSettings.showChatModelPicker}
                  onChange={(e) => updateSettings({ showChatModelPicker: e.target.checked })}
                />
              </label>
            </article>

            <article className="settings-card">
              <h4>Chat Defaults</h4>
              <label className="settings-line settings-line-stack">
                <span>Default Task Type</span>
                <select
                  value={uiSettings.defaultTaskType}
                  onChange={(e) => updateSettings({ defaultTaskType: e.target.value as TaskType })}
                >
                  <option value="FAST">FAST</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="REASONING">REASONING</option>
                  <option value="CODING">CODING</option>
                  <option value="VISION">VISION</option>
                  <option value="EMBEDDING">EMBEDDING</option>
                </select>
              </label>

              <label className="settings-line settings-line-stack">
                <span>Preferred Model</span>
                <select
                  value={uiSettings.preferredModelId}
                  onChange={(e) => updateSettings({ preferredModelId: e.target.value })}
                >
                  <option value="auto">Auto (recommended)</option>
                  {localModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>
              {localModels.length === 0 && (
                <p className="muted">No local models installed yet. Install models first to pin a default.</p>
              )}
            </article>

            <article className="settings-card">
              <h4>What JAE Can Do</h4>
              <label className="settings-line">
                <span>Keep Files Local-Only</span>
                <input
                  type="checkbox"
                  checked={uiSettings.filesLocalOnly}
                  onChange={(e) => updateSettings({ filesLocalOnly: e.target.checked })}
                />
              </label>
              <label className="settings-line">
                <span>Allow Internet Browse and Scan</span>
                <input
                  type="checkbox"
                  checked={uiSettings.internetResearchEnabled}
                  onChange={(e) => updateSettings({ internetResearchEnabled: e.target.checked })}
                />
              </label>
              <label className="settings-line">
                <span>Open Free Models (No API Keys)</span>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => undefined}
                  disabled
                />
              </label>
              <p className="muted" style={{ margin: 0 }}>
                Free model mode is always kept on for this local-first setup.
              </p>
            </article>

            <article className="settings-card">
              <h4>Runtime</h4>
              <p>App: {String(settings.app_name || "JAE AI")}</p>
              <p>Environment: {String(settings.environment || "development")}</p>
              <p>Inference Provider: {String(settings.inference_provider || "llamacpp")}</p>
              <p>OpenAI Base URL: {String(settings.openai_base_url || "-")}</p>
              <p className="muted">Operational and security controls are centralized in this page.</p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
