use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogoProfile {
    pub id: String,
    pub name: String,
    pub resolution_label: String,
    pub ref_width: u32,
    pub ref_height: u32,
    pub logo_width_percent: f64,
    pub pos_x_percent: f64,
    pub pos_y_percent: f64,
    pub opacity: f64,
    /// Is profile ke sath save hua logo image path (Home page isse auto-fill
    /// karta hai jab profile select ho).
    #[serde(default)]
    pub logo_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSettings {
    pub project_name: String,
    pub input_folder: String,
    pub output_folder: String,
    pub logo_path: String,
    pub active_profile_id: Option<String>,
    pub quality: String,
    pub audio_mode: String,
    pub number_padding: u32,
}

impl Default for BatchSettings {
    fn default() -> Self {
        Self {
            project_name: String::new(),
            input_folder: String::new(),
            output_folder: String::new(),
            logo_path: String::new(),
            active_profile_id: None,
            quality: "high".into(),
            audio_mode: "copy".into(),
            number_padding: 3,
        }
    }
}

/// App-wide (project-independent) preferences: language, theme mode, accent
/// color. Alag file mein rakhi hain taake BatchSettings (jo project-specific
/// hai) se mix na ho.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub language: String,
    pub theme_mode: String,
    pub accent_color: String,
    /// Pehli baar app khulne pe autostart khud-ba-khud ON kar diya jata hai.
    /// Ye flag ensure karta hai ke ye sirf EK baar ho — agar user ne khud
    /// baad mein disable kiya, to wo respect ho, dobara force-on na ho.
    #[serde(default)]
    pub autostart_default_applied: bool,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            language: "en".into(),
            theme_mode: "dark".into(),
            accent_color: "#7c5cff".into(),
            autostart_default_applied: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryFileEntry {
    pub input_name: String,
    pub output_name: String,
    pub status: String, // "done" | "failed"
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    pub id: String,
    pub project_name: String,
    pub input_folder: String,
    pub output_folder: String,
    pub profile_name: String,
    pub quality: String,
    pub audio_mode: String,
    /// Epoch milliseconds — frontend formats it locally (`new Date(ms)`).
    pub started_at: i64,
    pub finished_at: i64,
    pub success: u32,
    pub failed: u32,
    pub files: Vec<HistoryFileEntry>,
}

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    /// Git-hash/CI-tag se compute hua build version (build.rs mein) —
    /// dev builds mein "dev-<hash>", CI/release builds mein "v1.0.0".
    pub build_version: String,
    pub platform: String,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("App config dir nahi mila: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Config folder nahi ban saka: {e}"))?;
    Ok(dir)
}

fn profiles_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("profiles.json"))
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("settings.json"))
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("preferences.json"))
}

fn history_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("history.json"))
}

fn read_json<T: for<'de> Deserialize<'de> + Default>(path: &PathBuf) -> Result<T, String> {
    if !path.exists() {
        return Ok(T::default());
    }
    let raw = fs::read_to_string(path).map_err(|e| format!("{path:?} read nahi hui: {e}"))?;
    if raw.trim().is_empty() {
        return Ok(T::default());
    }
    serde_json::from_str(&raw).map_err(|e| format!("{path:?} parse nahi hui: {e}"))
}

fn write_json<T: Serialize>(path: &PathBuf, value: &T) -> Result<(), String> {
    let raw =
        serde_json::to_string_pretty(value).map_err(|e| format!("{path:?} serialize nahi hui: {e}"))?;
    fs::write(path, raw).map_err(|e| format!("{path:?} save nahi hui: {e}"))
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_profiles(app: AppHandle) -> Result<Vec<LogoProfile>, String> {
    read_json(&profiles_path(&app)?)
}

#[tauri::command]
pub fn save_profile(app: AppHandle, profile: LogoProfile) -> Result<Vec<LogoProfile>, String> {
    let path = profiles_path(&app)?;
    let mut profiles: Vec<LogoProfile> = read_json(&path)?;
    if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile;
    } else {
        profiles.push(profile);
    }
    write_json(&path, &profiles)?;
    Ok(profiles)
}

#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<Vec<LogoProfile>, String> {
    let path = profiles_path(&app)?;
    let mut profiles: Vec<LogoProfile> = read_json(&path)?;
    profiles.retain(|p| p.id != id);
    write_json(&path, &profiles)?;
    Ok(profiles)
}

// ---------------------------------------------------------------------------
// Batch settings
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_batch_settings(app: AppHandle) -> Result<BatchSettings, String> {
    read_json(&settings_path(&app)?)
}

#[tauri::command]
pub fn save_batch_settings(app: AppHandle, settings: BatchSettings) -> Result<(), String> {
    write_json(&settings_path(&app)?, &settings)
}

// ---------------------------------------------------------------------------
// App preferences (language / theme / accent color)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_app_preferences(app: AppHandle) -> Result<AppPreferences, String> {
    read_json(&preferences_path(&app)?)
}

#[tauri::command]
pub fn save_app_preferences(app: AppHandle, preferences: AppPreferences) -> Result<(), String> {
    write_json(&preferences_path(&app)?, &preferences)
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_history(app: AppHandle) -> Result<Vec<HistoryRecord>, String> {
    let mut records: Vec<HistoryRecord> = read_json(&history_path(&app)?)?;
    records.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(records)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    write_json(&history_path(&app)?, &Vec::<HistoryRecord>::new())
}

/// Batch run khatam hone ke baad ffmpeg.rs se call hota hai — record ko
/// history.json mein append kar deta hai. `started_at`/`id` caller deta hai.
pub fn append_history(app: &AppHandle, record: HistoryRecord) -> Result<(), String> {
    let path = history_path(app)?;
    let mut records: Vec<HistoryRecord> = read_json(&path)?;
    records.push(record);
    // Bohat purani entries jama na hon — sirf recent 200 rakho.
    if records.len() > 200 {
        let drop = records.len() - 200;
        records.drain(0..drop);
    }
    write_json(&path, &records)
}

pub fn new_history_id() -> String {
    format!("h{}", now_ms())
}

pub fn now_epoch_ms() -> i64 {
    now_ms()
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> AppInfo {
    let pkg = app.package_info();
    AppInfo {
        name: pkg.name.clone(),
        version: pkg.version.to_string(),
        build_version: env!("APP_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}
