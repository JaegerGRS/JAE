#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use tauri::Manager;

struct BackendState(Mutex<Option<Child>>);

fn copy_dir_all(source: &Path, target: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }

    fs::create_dir_all(target).map_err(|err| err.to_string())?;
    for entry in fs::read_dir(source).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let entry_path = entry.path();
        let target_path = target.join(entry.file_name());
        if entry.file_type().map_err(|err| err.to_string())?.is_dir() {
            copy_dir_all(&entry_path, &target_path)?;
        } else {
            fs::copy(&entry_path, &target_path).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

fn ensure_app_runtime(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join("runtime");

    fs::create_dir_all(&app_data_dir).map_err(|err| err.to_string())?;
    fs::create_dir_all(app_data_dir.join("data")).map_err(|err| err.to_string())?;
    fs::create_dir_all(app_data_dir.join("backups")).map_err(|err| err.to_string())?;

    let template_dir = app
        .path()
        .resolve("app-template", tauri::path::BaseDirectory::Resource)
        .map_err(|err| err.to_string())?;

    copy_dir_all(&template_dir.join("config"), &app_data_dir.join("config"))?;
    Ok(app_data_dir)
}

fn spawn_backend(app: &tauri::AppHandle) -> Result<Child, String> {
    if cfg!(debug_assertions) {
        return Err("dev mode uses the external backend started by scripts/dev.ps1".into());
    }

    let runtime_root = ensure_app_runtime(app)?;
    let backend_exe = app
        .path()
        .resolve(
            "backend-runtime/jae-ai-backend/jae-ai-backend.exe",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|err| err.to_string())?;

    Command::new(backend_exe)
        .current_dir(&runtime_root)
        .env("JAE_AI_PROJECT_ROOT", &runtime_root)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| err.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(BackendState(Mutex::new(None)))
        .setup(|app| {
            if !cfg!(debug_assertions) {
                let child = spawn_backend(app.handle())?;
                let state = app.state::<BackendState>();
                let mut guard = state.0.lock().map_err(|_| String::from("backend state lock poisoned"))?;
                *guard = Some(child);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let maybe_child = {
                    let state = window.state::<BackendState>();
                    let child = match state.0.lock() {
                        Ok(mut guard) => guard.take(),
                        Err(_) => None,
                    };
                    child
                };

                if let Some(mut child) = maybe_child {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
