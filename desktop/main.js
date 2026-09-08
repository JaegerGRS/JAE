const { app, BrowserWindow, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

const REPO_URL = "https://github.com/JaegerGRS/Personal-AI.github.io";
const LOCAL_APP_URL = "http://127.0.0.1:4173";
const API_HEALTH_URL = "http://127.0.0.1:8000/api/v1/health";

let backendProcess;

function startBackend() {
  const projectRoot = path.resolve(__dirname, "..");
  const pythonPath = path.join(projectRoot, ".venv", "Scripts", "python.exe");

  backendProcess = spawn(pythonPath, ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"], {
    cwd: projectRoot,
    windowsHide: true,
    stdio: "ignore",
    detached: false,
  });
}

function createMenu() {
  const template = [
    {
      label: "JAE AI",
      submenu: [
        {
          label: "Open GitHub Repo",
          click: () => shell.openExternal(REPO_URL),
        },
        {
          label: "Backend Health",
          click: () => shell.openExternal(API_HEALTH_URL),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggledevtools" }, { role: "resetzoom" }, { role: "zoomin" }, { role: "zoomout" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: "#050505",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(LOCAL_APP_URL);
}

app.whenReady().then(() => {
  startBackend();
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
