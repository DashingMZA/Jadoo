use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use super::profiles::{AppPreferences, BatchSettings, HistoryFileEntry, HistoryRecord, LogoProfile};

/// Managed state — ek hi Connection poori app mein share hoti hai (Mutex se
/// guarded, kyunke SQLite connection ek waqt mein ek thread se use honi
/// chahiye).
pub struct Db(pub Mutex<Connection>);

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    resolution_label TEXT NOT NULL,
    ref_width INTEGER NOT NULL,
    ref_height INTEGER NOT NULL,
    logo_width_percent REAL NOT NULL,
    pos_x_percent REAL NOT NULL,
    pos_y_percent REAL NOT NULL,
    opacity REAL NOT NULL,
    logo_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    project_name TEXT NOT NULL DEFAULT '',
    input_folder TEXT NOT NULL DEFAULT '',
    output_folder TEXT NOT NULL DEFAULT '',
    logo_path TEXT NOT NULL DEFAULT '',
    active_profile_id TEXT,
    quality TEXT NOT NULL DEFAULT 'high',
    audio_mode TEXT NOT NULL DEFAULT 'copy',
    number_padding INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS app_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    language TEXT NOT NULL DEFAULT 'en',
    theme_mode TEXT NOT NULL DEFAULT 'dark',
    accent_color TEXT NOT NULL DEFAULT '#7c5cff',
    autostart_default_applied INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    input_folder TEXT NOT NULL,
    output_folder TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    quality TEXT NOT NULL,
    audio_mode TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER NOT NULL,
    success INTEGER NOT NULL,
    failed INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history_files (
    history_id TEXT NOT NULL REFERENCES history(id) ON DELETE CASCADE,
    input_name TEXT NOT NULL,
    output_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_files_history_id ON history_files(history_id);
"#;

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("App config dir nahi mila: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Config folder nahi bana: {e}"))?;
    Ok(dir.join("jadoo.db"))
}

pub fn init(app: &AppHandle) -> Result<Db, String> {
    let path = db_path(app)?;
    let conn = Connection::open(&path).map_err(|e| format!("Database nahi khuli: {e}"))?;
    conn.execute_batch(SCHEMA)
        .map_err(|e| format!("Database schema nahi ban saka: {e}"))?;

    migrate_from_json_if_needed(app, &conn);

    Ok(Db(Mutex::new(conn)))
}

/// Purani JSON-file-based storage (`profiles.json`, `settings.json`,
/// `preferences.json`, `history.json`) se — SIRF agar DB abhi khali hai aur
/// wo files maujood hain — ek dafa data copy kar leta hai, taake purane
/// users apgrade karne pe apni profiles/history na khoyein. Migrate hone ke
/// baad purani files `.migrated` suffix ke sath rakh di jati hain (delete
/// nahi — safety ke liye).
fn migrate_from_json_if_needed(app: &AppHandle, conn: &Connection) {
    let Ok(dir) = app.path().app_config_dir() else { return };

    let profiles_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM profiles", [], |r| r.get(0))
        .unwrap_or(0);

    if profiles_count == 0 {
        let path = dir.join("profiles.json");
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(list) = serde_json::from_str::<Vec<LogoProfile>>(&raw) {
                for p in &list {
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO profiles (id, name, resolution_label, ref_width, ref_height, logo_width_percent, pos_x_percent, pos_y_percent, opacity, logo_path, created_at, updated_at)
                         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                        rusqlite::params![p.id, p.name, p.resolution_label, p.ref_width, p.ref_height, p.logo_width_percent, p.pos_x_percent, p.pos_y_percent, p.opacity, p.logo_path, p.created_at, p.updated_at],
                    );
                }
                let _ = fs::rename(&path, dir.join("profiles.json.migrated"));
            }
        }
    }

    let settings_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_settings", [], |r| r.get(0))
        .unwrap_or(0);
    if settings_count == 0 {
        let path = dir.join("settings.json");
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(s) = serde_json::from_str::<BatchSettings>(&raw) {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO app_settings (id, project_name, input_folder, output_folder, logo_path, active_profile_id, quality, audio_mode, number_padding)
                     VALUES (1,?1,?2,?3,?4,?5,?6,?7,?8)",
                    rusqlite::params![s.project_name, s.input_folder, s.output_folder, s.logo_path, s.active_profile_id, s.quality, s.audio_mode, s.number_padding],
                );
                let _ = fs::rename(&path, dir.join("settings.json.migrated"));
            }
        }
    }

    let prefs_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_preferences", [], |r| r.get(0))
        .unwrap_or(0);
    if prefs_count == 0 {
        let path = dir.join("preferences.json");
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(p) = serde_json::from_str::<AppPreferences>(&raw) {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO app_preferences (id, language, theme_mode, accent_color, autostart_default_applied)
                     VALUES (1,?1,?2,?3,?4)",
                    rusqlite::params![p.language, p.theme_mode, p.accent_color, p.autostart_default_applied],
                );
                let _ = fs::rename(&path, dir.join("preferences.json.migrated"));
            }
        }
    }

    let history_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM history", [], |r| r.get(0))
        .unwrap_or(0);
    if history_count == 0 {
        let path = dir.join("history.json");
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(list) = serde_json::from_str::<Vec<HistoryRecord>>(&raw) {
                for h in &list {
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO history (id, project_name, input_folder, output_folder, profile_name, quality, audio_mode, started_at, finished_at, success, failed)
                         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
                        rusqlite::params![h.id, h.project_name, h.input_folder, h.output_folder, h.profile_name, h.quality, h.audio_mode, h.started_at, h.finished_at, h.success, h.failed],
                    );
                    for f in &h.files {
                        let _ = conn.execute(
                            "INSERT INTO history_files (history_id, input_name, output_name, status, message) VALUES (?1,?2,?3,?4,?5)",
                            rusqlite::params![h.id, f.input_name, f.output_name, f.status, f.message],
                        );
                    }
                }
                let _ = fs::rename(&path, dir.join("history.json.migrated"));
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

pub fn get_profiles(conn: &Connection) -> Result<Vec<LogoProfile>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, resolution_label, ref_width, ref_height, logo_width_percent, pos_x_percent, pos_y_percent, opacity, logo_path, created_at, updated_at
             FROM profiles ORDER BY created_at",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(LogoProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                resolution_label: row.get(2)?,
                ref_width: row.get(3)?,
                ref_height: row.get(4)?,
                logo_width_percent: row.get(5)?,
                pos_x_percent: row.get(6)?,
                pos_y_percent: row.get(7)?,
                opacity: row.get(8)?,
                logo_path: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn save_profile(conn: &Connection, p: &LogoProfile) -> Result<(), String> {
    conn.execute(
        "INSERT INTO profiles (id, name, resolution_label, ref_width, ref_height, logo_width_percent, pos_x_percent, pos_y_percent, opacity, logo_path, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
         ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, resolution_label=excluded.resolution_label,
            ref_width=excluded.ref_width, ref_height=excluded.ref_height,
            logo_width_percent=excluded.logo_width_percent,
            pos_x_percent=excluded.pos_x_percent, pos_y_percent=excluded.pos_y_percent,
            opacity=excluded.opacity, logo_path=excluded.logo_path,
            updated_at=excluded.updated_at",
        rusqlite::params![p.id, p.name, p.resolution_label, p.ref_width, p.ref_height, p.logo_width_percent, p.pos_x_percent, p.pos_y_percent, p.opacity, p.logo_path, p.created_at, p.updated_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_profile(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM profiles WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Batch settings (single row)
// ---------------------------------------------------------------------------

pub fn get_batch_settings(conn: &Connection) -> Result<BatchSettings, String> {
    let result = conn.query_row(
        "SELECT project_name, input_folder, output_folder, logo_path, active_profile_id, quality, audio_mode, number_padding FROM app_settings WHERE id = 1",
        [],
        |row| {
            Ok(BatchSettings {
                project_name: row.get(0)?,
                input_folder: row.get(1)?,
                output_folder: row.get(2)?,
                logo_path: row.get(3)?,
                active_profile_id: row.get(4)?,
                quality: row.get(5)?,
                audio_mode: row.get(6)?,
                number_padding: row.get(7)?,
            })
        },
    );

    match result {
        Ok(s) => Ok(s),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(BatchSettings::default()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn save_batch_settings(conn: &Connection, s: &BatchSettings) -> Result<(), String> {
    conn.execute(
        "INSERT INTO app_settings (id, project_name, input_folder, output_folder, logo_path, active_profile_id, quality, audio_mode, number_padding)
         VALUES (1,?1,?2,?3,?4,?5,?6,?7,?8)
         ON CONFLICT(id) DO UPDATE SET
            project_name=excluded.project_name, input_folder=excluded.input_folder,
            output_folder=excluded.output_folder, logo_path=excluded.logo_path,
            active_profile_id=excluded.active_profile_id, quality=excluded.quality,
            audio_mode=excluded.audio_mode, number_padding=excluded.number_padding",
        rusqlite::params![s.project_name, s.input_folder, s.output_folder, s.logo_path, s.active_profile_id, s.quality, s.audio_mode, s.number_padding],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// App preferences (single row)
// ---------------------------------------------------------------------------

pub fn get_app_preferences(conn: &Connection) -> Result<AppPreferences, String> {
    let result = conn.query_row(
        "SELECT language, theme_mode, accent_color, autostart_default_applied FROM app_preferences WHERE id = 1",
        [],
        |row| {
            Ok(AppPreferences {
                language: row.get(0)?,
                theme_mode: row.get(1)?,
                accent_color: row.get(2)?,
                autostart_default_applied: row.get(3)?,
            })
        },
    );

    match result {
        Ok(p) => Ok(p),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(AppPreferences::default()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn save_app_preferences(conn: &Connection, p: &AppPreferences) -> Result<(), String> {
    conn.execute(
        "INSERT INTO app_preferences (id, language, theme_mode, accent_color, autostart_default_applied)
         VALUES (1,?1,?2,?3,?4)
         ON CONFLICT(id) DO UPDATE SET
            language=excluded.language, theme_mode=excluded.theme_mode,
            accent_color=excluded.accent_color, autostart_default_applied=excluded.autostart_default_applied",
        rusqlite::params![p.language, p.theme_mode, p.accent_color, p.autostart_default_applied],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

pub fn get_history(conn: &Connection) -> Result<Vec<HistoryRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_name, input_folder, output_folder, profile_name, quality, audio_mode, started_at, finished_at, success, failed
             FROM history ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(HistoryRecord {
                id: row.get(0)?,
                project_name: row.get(1)?,
                input_folder: row.get(2)?,
                output_folder: row.get(3)?,
                profile_name: row.get(4)?,
                quality: row.get(5)?,
                audio_mode: row.get(6)?,
                started_at: row.get(7)?,
                finished_at: row.get(8)?,
                success: row.get(9)?,
                failed: row.get(10)?,
                files: vec![],
            })
        })
        .map_err(|e| e.to_string())?;

    let mut records = rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut files_stmt = conn
        .prepare("SELECT input_name, output_name, status, message FROM history_files WHERE history_id = ?1")
        .map_err(|e| e.to_string())?;

    for record in &mut records {
        let files = files_stmt
            .query_map([&record.id], |row| {
                Ok(HistoryFileEntry {
                    input_name: row.get(0)?,
                    output_name: row.get(1)?,
                    status: row.get(2)?,
                    message: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        record.files = files;
    }

    Ok(records)
}

pub fn append_history(conn: &Connection, record: &HistoryRecord) -> Result<(), String> {
    conn.execute(
        "INSERT INTO history (id, project_name, input_folder, output_folder, profile_name, quality, audio_mode, started_at, finished_at, success, failed)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        rusqlite::params![record.id, record.project_name, record.input_folder, record.output_folder, record.profile_name, record.quality, record.audio_mode, record.started_at, record.finished_at, record.success, record.failed],
    )
    .map_err(|e| e.to_string())?;

    for f in &record.files {
        conn.execute(
            "INSERT INTO history_files (history_id, input_name, output_name, status, message) VALUES (?1,?2,?3,?4,?5)",
            rusqlite::params![record.id, f.input_name, f.output_name, f.status, f.message],
        )
        .map_err(|e| e.to_string())?;
    }

    // Bohat purani entries jama na hon — sirf recent 200 rakho.
    conn.execute(
        "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY started_at DESC LIMIT 200)",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn clear_history(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
    Ok(())
}
