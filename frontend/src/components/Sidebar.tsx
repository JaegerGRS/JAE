import { NavLink } from "react-router-dom";
import { useUiSettings } from "../lib/uiSettings";

const coreSections = [
  {
    title: "Core",
    items: [
      { to: "/", label: "Chat" },
      { to: "/conversations", label: "Conversations" },
      { to: "/models", label: "Models" },
      { to: "/settings", label: "Settings" },
    ],
  },
];

const advancedSections = [
  {
    title: "Workspace",
    items: [
      { to: "/memory", label: "Memory" },
      { to: "/files", label: "Files" },
      { to: "/system", label: "System" },
      { to: "/nodes", label: "Nodes" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/tools", label: "Tools" },
      { to: "/skills", label: "Skills" },
      { to: "/agents", label: "Agents" },
      { to: "/backup", label: "Backup" },
      { to: "/updates", label: "Updates" },
      { to: "/logs", label: "Logs" },
      { to: "/security", label: "Security" },
    ],
  },
];

export function Sidebar() {
  const { settings, updateSettings } = useUiSettings();

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>JAE AI</h1>
        <p>Private Local Assistant</p>
      </div>
      <nav>
        {coreSections.map((section) => (
          <div key={section.title} className="nav-section">
            <p className="nav-section-title">{section.title}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-section">
          <button
            className="nav-toggle"
            onClick={() => updateSettings({ showAdvancedNavigation: !settings.showAdvancedNavigation })}
          >
            {settings.showAdvancedNavigation ? "Hide Advanced" : "Show Advanced"}
          </button>
        </div>

        {settings.showAdvancedNavigation &&
          advancedSections.map((section) => (
            <div key={section.title} className="nav-section">
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
      </nav>
    </aside>
  );
}
