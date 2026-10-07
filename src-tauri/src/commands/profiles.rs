use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use super::db::Db;

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
/// color. Alag table mein rakhi hain taake BatchSettings (jo project-specific
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
    pub build_version: String,
    pub platform: String,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn now_epoch_ms() -> i64 {
    now_ms()
}

pub fn new_history_id() -> String {
    format!("h{}", now_ms())
}

fn lock(db: &Db) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, String> {
    db.0.lock().map_err(|_| "Database lock poisoned ho gaya.".to_string())
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_profiles(db: State<Db>) -> Result<Vec<LogoProfile>, String> {
    super::db::get_profiles(&*lock(&db)?)
}

#[tauri::command]
pub fn save_profile(db: State<Db>, profile: LogoProfile) -> Result<Vec<LogoProfile>, String> {
    let conn = lock(&db)?;
    super::db::save_profile(&conn, &profile)?;
    super::db::get_profiles(&conn)
}

#[tauri::command]
pub fn delete_profile(db: State<Db>, id: String) -> Result<Vec<LogoProfile>, String> {
    let conn = lock(&db)?;
    super::db::delete_profile(&conn, &id)?;
    super::db::get_profiles(&conn)
}

// ---------------------------------------------------------------------------
// Batch settings
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_batch_settings(db: State<Db>) -> Result<BatchSettings, String> {
    super::db::get_batch_settings(&*lock(&db)?)
}

#[tauri::command]
pub fn save_batch_settings(db: State<Db>, settings: BatchSettings) -> Result<(), String> {
    super::db::save_batch_settings(&*lock(&db)?, &settings)
}

// ---------------------------------------------------------------------------
// App preferences (language / theme / accent color)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_app_preferences(db: State<Db>) -> Result<AppPreferences, String> {
    super::db::get_app_preferences(&*lock(&db)?)
}

#[tauri::command]
pub fn save_app_preferences(db: State<Db>, preferences: AppPreferences) -> Result<(), String> {
    super::db::save_app_preferences(&*lock(&db)?, &preferences)
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_history(db: State<Db>) -> Result<Vec<HistoryRecord>, String> {
    super::db::get_history(&*lock(&db)?)
}

#[tauri::command]
pub fn clear_history(db: State<Db>) -> Result<(), String> {
    super::db::clear_history(&*lock(&db)?)
}

/// Batch run khatam hone ke baad ffmpeg.rs se call hota hai.
pub fn append_history(app: &AppHandle, record: HistoryRecord) -> Result<(), String> {
    let db = app.state::<Db>();
    let conn = lock(&db)?;
    super::db::append_history(&conn, &record)
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
