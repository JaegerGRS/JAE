import { useCallback, useEffect, useState } from "react";
import type { TaskType } from "../types/api";

const UI_SETTINGS_KEY = "jae-ui-settings-v1";
const UI_SETTINGS_EVENT = "jae-ui-settings-changed";

export type UiSettings = {
  showAdvancedNavigation: boolean;
  showChatModelPicker: boolean;
  defaultTaskType: TaskType;
  preferredModelId: string;
  filesLocalOnly: boolean;
  internetResearchEnabled: boolean;
  freeModelAccess: boolean;
};

const DEFAULT_UI_SETTINGS: UiSettings = {
  showAdvancedNavigation: false,
  showChatModelPicker: false,
  defaultTaskType: "GENERAL",
  preferredModelId: "auto",
  filesLocalOnly: true,
  internetResearchEnabled: true,
  freeModelAccess: true,
};

function readStoredSettings(): UiSettings {
  try {
    const raw = window.localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_UI_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      ...DEFAULT_UI_SETTINGS,
      ...parsed,
      freeModelAccess: true,
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

function writeStoredSettings(next: UiSettings): void {
  window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<UiSettings>(UI_SETTINGS_EVENT, { detail: next }));
}

export function useUiSettings() {
  const [settings, setSettings] = useState<UiSettings>(() => readStoredSettings());

  useEffect(() => {
    const onSettingsChanged = (evt: Event) => {
      const custom = evt as CustomEvent<UiSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
      }
    };

    const onStorage = (evt: StorageEvent) => {
      if (evt.key === UI_SETTINGS_KEY) {
        setSettings(readStoredSettings());
      }
    };

    window.addEventListener(UI_SETTINGS_EVENT, onSettingsChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UI_SETTINGS_EVENT, onSettingsChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<UiSettings>) => {
    const current = readStoredSettings();
    const next = { ...current, ...patch, freeModelAccess: true };
    writeStoredSettings(next);
    setSettings(next);
  }, []);

  return { settings, updateSettings };
}
