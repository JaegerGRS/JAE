import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { AgentsPage } from "./pages/AgentsPage";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { BackupPage } from "./pages/BackupPage";
import { ChatPage } from "./pages/ChatPage";
import { ConversationsPage } from "./pages/ConversationsPage";
import { FilesPage } from "./pages/FilesPage";
import { LogsPage } from "./pages/LogsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { ModelsPage } from "./pages/ModelsPage";
import { NodesPage } from "./pages/NodesPage";
import { SecurityPage } from "./pages/SecurityPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SkillsPage } from "./pages/SkillsPage";
import { SupportersPage } from "./pages/SupportersPage";
import { SystemPage } from "./pages/SystemPage";
import { ToolsPage } from "./pages/ToolsPage";
import { UpdatesPage } from "./pages/UpdatesPage";
import { useUiSettings } from "./lib/uiSettings";

export default function App() {
  const { settings } = useUiSettings();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.themeMode;

    const styleId = "jae-custom-css";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = settings.customCss;
  }, [settings.themeMode, settings.customCss]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <TopBar />
        <div className="content">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/nodes" element={<NodesPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/updates" element={<UpdatesPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/supporters" element={<SupportersPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
