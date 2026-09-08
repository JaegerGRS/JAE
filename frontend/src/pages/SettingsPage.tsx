import { useEffect, useState } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useUiSettings } from "../lib/uiSettings";
import { getModels, getModelStatus, getSettings, getStorageStatus, moveStorage } from "../services/api";
import type { ModelInfo, StorageStatus, TaskType } from "../types/api";

export function SettingsPage() {
  const { settings: uiSettings, updateSettings } = useUiSettings();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [localModelIds, setLocalModelIds] = useState<string[]>([]);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [storageMessage, setStorageMessage] = useState("");
  const [movingStorage, setMovingStorage] = useState(false);

  useEffect(() => {
    Promise.all([getSettings(), getModels(), getModelStatus(), getStorageStatus()])
      .then(([settingsRes, modelsRes, statusRes, storageRes]) => {
        setSettings(settingsRes.data);
        setModels((modelsRes.data.models as ModelInfo[]) || []);
        const local = ((statusRes.data.models as Array<{ id: string; exists: boolean }>) || [])
          .filter((m) => m.exists)
          .map((m) => m.id);
        setLocalModelIds(local);
        setStorage(storageRes.data);
      })
      .catch(() => {
        setSettings({});
        setModels([]);
        setLocalModelIds([]);
        setStorage(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const localModels = models.filter((m) => localModelIds.includes(m.id));

  async function handleMoveStorage(targetMode: "portable" | "native", driveRoot?: string) {
    try {
      setMovingStorage(true);
      const result = await moveStorage(targetMode, driveRoot);
      setStorageMessage(result.data.message);
      const refreshed = await getStorageStatus();
      setStorage(refreshed.data);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "Storage move failed.");
    } finally {
      setMovingStorage(false);
    }
  }

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

            <article className="settings-card settings-card-wide">
              <h4>Theme Studio</h4>
              <label className="settings-line settings-line-stack">
                <span>Theme Mode</span>
                <select
                  value={uiSettings.themeMode}
                  onChange={(e) => updateSettings({ themeMode: e.target.value as "dark" | "light" })}
                >
                  <option value="dark">Dark Default</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label className="settings-line settings-line-stack">
                <span>Custom CSS</span>
                <textarea
                  className="settings-css-editor"
                  value={uiSettings.customCss}
                  onChange={(e) => updateSettings({ customCss: e.target.value })}
                  rows={8}
                  placeholder={":root {\n  --accent: #d7efe8;\n  --line: #3a3a3a;\n}\n\n.topbar {\n  border-radius: 24px;\n}"}
                />
              </label>
              <p className="muted settings-help">
                Dark stays the default. Light mode and custom CSS are optional overrides for people who want a different look.
              </p>
            </article>

            <article className="settings-card">
              <h4>Voice</h4>
              <label className="settings-line">
                <span>Enable Voice Input</span>
                <input
                  type="checkbox"
                  checked={uiSettings.voiceEnabled}
                  onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
                />
              </label>
              <label className="settings-line">
                <span>Wake Phrase: “Hi Jae”</span>
                <input
                  type="checkbox"
                  checked={uiSettings.voiceWakePhraseEnabled}
                  onChange={(e) => updateSettings({ voiceWakePhraseEnabled: e.target.checked })}
                  disabled={!uiSettings.voiceEnabled}
                />
              </label>
              <p className="muted" style={{ margin: 0 }}>
                People can use the voice button any time, or say “Hi Jae” to start dictation when wake phrase listening is on.
              </p>
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
              <p>App: {String(settings.app_name || "JAE")}</p>
              <p>Environment: {String(settings.environment || "development")}</p>
              <p>Inference Provider: {String(settings.inference_provider || "llamacpp")}</p>
              <p>OpenAI Base URL: {String(settings.openai_base_url || "-")}</p>
              <p className="muted">Operational and security controls are centralized in this page.</p>
            </article>

            <article className="settings-card settings-card-wide">
              <h4>Chat Storage</h4>
              <p className="muted">
                JAE can auto-detect a portable USB chat vault or move chats back to this device for faster native drive speeds.
              </p>
              <p>Current Mode: {storage?.current_mode || "unknown"}</p>
              <p>Current Root: {storage?.current_root || "-"}</p>
              <p>Database: {storage?.database_path || "-"}</p>
              <p>Native Root: {storage?.native_root || "-"}</p>
              <p className="muted">{storage?.performance_hint || "Native drive is fastest. USB keeps chats portable."}</p>
              <div className="storage-actions">
                <button type="button" onClick={() => handleMoveStorage("native")} disabled={movingStorage}>
                  Move Chats To This Device
                </button>
              </div>
              <div className="storage-drive-list">
                {(storage?.portable_drives || []).length === 0 ? (
                  <p className="muted">No portable JAE USB drive detected yet. Insert a USB drive, then move chats to it.</p>
                ) : (
                  storage?.portable_drives.map((drive) => (
                    <div key={drive.drive_root} className="storage-drive-card">
                      <div>
                        <strong>{drive.drive_root}</strong>
                        <p className="muted">Portable Root: {drive.portable_root}</p>
                        <p className="muted">{drive.marker_present ? "Portable vault detected" : "Removable drive ready for JAE portable chats"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMoveStorage("portable", drive.drive_root)}
                        disabled={movingStorage}
                      >
                        Move Chats To USB
                      </button>
                    </div>
                  ))
                )}
              </div>
              {storageMessage ? <p className="muted settings-help">{storageMessage}</p> : null}
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
