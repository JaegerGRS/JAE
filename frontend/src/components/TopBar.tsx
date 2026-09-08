import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Chat",
  "/conversations": "Conversations",
  "/memory": "Memory",
  "/system": "System",
  "/models": "Models",
  "/nodes": "Nodes",
  "/tools": "Tools",
  "/skills": "Skills",
  "/agents": "Agents",
  "/files": "Files",
  "/backup": "Backup",
  "/updates": "Updates",
  "/logs": "Logs",
  "/security": "Security",
  "/settings": "Settings",
};

export function TopBar() {
  const location = useLocation();
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const pageTitle = useMemo(() => routeTitles[location.pathname] || "Control Panel", [location.pathname]);

  return (
    <header className="topbar">
      <div>
        <h2>{pageTitle}</h2>
        <p>Local-first runtime with private by default controls</p>
      </div>
      <div className="topbar-right">
        <div className="topbar-time">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        <div className="topbar-pill">localhost only</div>
      </div>
    </header>
  );
}
