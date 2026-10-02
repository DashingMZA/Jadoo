use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Emitter, Manager};
use serde::Serialize;
use tauri_plugin_shell::ShellExt;

use super::profiles::{self, BatchSettings, HistoryFileEntry, HistoryRecord, LogoProfile};

const VIDEO_EXTENSIONS: &[&str] = &["mp4", "mov", "mkv", "avi", "m4v", "webm"];

fn quality_args(quality: &str) -> (&'static str, &'static str) {
    match quality {
        "fast" => ("veryfast", "23"),
        "ultra" => ("slow", "14"),
        "lossless" => ("veryslow", "0"),
        // "high" and anything unrecognised falls back to the balanced default
        _ => ("medium", "18"),
    }
}

fn audio_args(audio_mode: &str) -> Vec<String> {
    if audio_mode == "reencode_aac" {
        vec!["-c:a".into(), "aac".into(), "-b:a".into(), "192k".into()]
    } else {
        vec!["-c:a".into(), "copy".into()]
    }
}

/// Logo ko bottom-right (ya jahan bhi profile mein set kiya gaya ho) transparent
/// overlay karta hai, aspect-ratio preserve karte hue.
///
/// IMPORTANT: `scale2ref=[main][ref]` mein `main_w`/`main_h` first (main) input
/// ke apne original dims hote hain, aur `iw`/`ih` reference (second) input ke
/// dims hote hain — ye normal `scale` filter se ULTA hai. Hamare graph mein
/// `[1:v]` (logo) main hai aur `[0:v]` (video) reference hai, isliye:
///   - `iw`      = video ki width (jis ke against hum % scale karna chahte hain)
///   - `main_w`/`main_h` = logo ki apni original width/height (aspect ratio ke liye)
/// `h=-1` scale2ref mein REFERENCE (video) ka aspect ratio lock karta hai, logo
/// ka nahi — isliye square logo bhi stretch ho jata tha. Neeche wala formula
/// logo ki apni aspect ratio (main_h/main_w) explicitly use karta hai.
fn build_filter_complex(profile: &LogoProfile) -> String {
    format!(
        "[1:v][0:v]scale2ref=w='iw*{w}':h='main_h*(iw*{w})/main_w'[logo][base];\
         [logo]format=rgba,colorchannelmixer=aa={op}[logoa];\
         [base][logoa]overlay=x='(main_w-overlay_w)*{px}':y='(main_h-overlay_h)*{py}'",
        w = profile.logo_width_percent,
        op = profile.opacity,
        px = profile.pos_x_percent,
        py = profile.pos_y_percent,
    )
}

pub fn list_video_files(folder: &str) -> Result<Vec<PathBuf>, String> {
    let dir = Path::new(folder);
    if !dir.exists() {
        return Err(format!("Input folder nahi mila: {folder}"));
    }
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("Input folder read nahi ho saka: {e}"))?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|p| {
            p.is_file()
                && p.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| VIDEO_EXTENSIONS.contains(&e.to_lowercase().as_str()))
                    .unwrap_or(false)
        })
        .collect();
    files.sort();
    Ok(files)
}

/// OUTPUT_FOLDER mein dekhta hai ke "{project}_<number>" pattern ki konsi sabse
/// badi number wali file pehle se maujood hai, aur uske aage se number return
/// karta hai. Numbering isliye kabhi restart nahi hoti aur purani files
/// overwrite nahi hoti.
fn next_start_number(output_folder: &Path, project_name: &str) -> u32 {
    let mut max_num = 0u32;
    if let Ok(entries) = fs::read_dir(output_folder) {
        let prefix = format!("{project_name}_");
        for entry in entries.filter_map(|e| e.ok()) {
            if let Some(stem) = entry.path().file_stem().and_then(|s| s.to_str()) {
                if let Some(rest) = stem.strip_prefix(&prefix) {
                    if let Ok(n) = rest.parse::<u32>() {
                        max_num = max_num.max(n);
                    }
                }
            }
        }
    }
    max_num + 1
}

// ---------------------------------------------------------------------------
// Default / sample preview videos (per resolution)
//
// Pehle ye ffmpeg se ek frame extract karke JPEG banate the — kuch videos
// (odd pixel format/color space) ke sath ye corrupted/glitchy image deta tha.
// Ab hum seedha asal video file ka LOCAL PATH return karte hain aur frontend
// use `convertFileSrc()` ke through ek native <video> tag mein play karta hai
// — koi re-encode nahi, koi corruption nahi, aur bonus mein video actually
// play bhi hoti hai (static frame ki bajaye).
// ---------------------------------------------------------------------------

fn slugify(label: &str) -> String {
    label
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// `src-tauri/sample-videos.json` shape:
/// ```json
/// { "byResolutionLabel": { "<exact label>": "<url>" },
///   "byAspect": { "16:9": "<url>", "9:16": "<url>", ... } }
/// ```
/// Developer isse build se pehle bharta hai; end-user isse edit nahi karta
/// (ye installer ke sath bundle hoti hai, Program Files jaisi protected
/// location mein).
#[derive(Debug, Default, serde::Deserialize)]
struct SampleVideoUrls {
    #[serde(default, rename = "byResolutionLabel")]
    by_resolution_label: HashMap<String, String>,
    #[serde(default, rename = "byAspect")]
    by_aspect: HashMap<String, String>,
}

fn load_sample_video_urls(app: &AppHandle) -> SampleVideoUrls {
    let candidates = [
        app.path()
            .resource_dir()
            .ok()
            .map(|d| d.join("sample-videos.json")),
        Some(PathBuf::from("sample-videos.json")),
    ];
    for candidate in candidates.into_iter().flatten() {
        if let Ok(raw) = fs::read_to_string(&candidate) {
            if let Ok(map) = serde_json::from_str::<SampleVideoUrls>(&raw) {
                return map;
            }
        }
    }
    SampleVideoUrls::default()
}

/// Sample video resolve karne ki priority (exact resolution ke liye, phir
/// aspect-ratio ke liye — isi tarteeb se dono "bundled local file" aur phir
/// "URL se download+cache" try hota hai):
/// 1. Bundled resource: `sample-videos/<slug-of-label>.mp4`
/// 2. Cache: `app_cache_dir/sample-videos/<slug-of-label>.mp4`
/// 3. `sample-videos.json` -> `byResolutionLabel[label]` (download+cache)
/// 4. Bundled resource: `sample-videos/<slug-of-aspect>.mp4`
/// 5. Cache: `app_cache_dir/sample-videos/<slug-of-aspect>.mp4`
/// 6. `sample-videos.json` -> `byAspect[aspect]` (download+cache)
async fn resolve_sample_video_path(
    app: &AppHandle,
    resolution_label: &str,
    aspect_ratio: &str,
) -> Result<PathBuf, String> {
    let urls = load_sample_video_urls(app);

    for (key, url_map) in [
        (resolution_label, &urls.by_resolution_label),
        (aspect_ratio, &urls.by_aspect),
    ] {
        if key.is_empty() {
            continue;
        }
        let slug = slugify(key);

        if let Ok(resource_dir) = app.path().resource_dir() {
            let bundled = resource_dir.join("sample-videos").join(format!("{slug}.mp4"));
            if bundled.exists() {
                return Ok(bundled);
            }
        }

        let cache_dir = app
            .path()
            .app_cache_dir()
            .map_err(|e| format!("Cache dir nahi mila: {e}"))?
            .join("sample-videos");
        fs::create_dir_all(&cache_dir).map_err(|e| format!("Cache folder nahi bana: {e}"))?;
        let cached = cache_dir.join(format!("{slug}.mp4"));
        if cached.exists() {
            return Ok(cached);
        }

        if let Some(url) = url_map.get(key).filter(|u| !u.is_empty()) {
            let response = reqwest::get(url)
                .await
                .map_err(|e| format!("Sample video download nahi ho saki: {e}"))?;
            if !response.status().is_success() {
                return Err(format!("Sample video download fail hui (HTTP {}).", response.status()));
            }
            let bytes = response
                .bytes()
                .await
                .map_err(|e| format!("Sample video download nahi ho saki: {e}"))?;
            fs::write(&cached, &bytes).map_err(|e| format!("Sample video save nahi hui: {e}"))?;
            return Ok(cached);
        }
    }

    Err("Is resolution/aspect-ratio ke liye koi sample video configure nahi hai.".to_string())
}

/// Frontend ko sirf local path chahiye — wo khud `convertFileSrc()` se ek
/// chalane-laayak `<video src>` bana lega.
#[tauri::command]
pub async fn get_default_video_path(
    app: AppHandle,
    resolution_label: String,
    aspect_ratio: String,
) -> Result<String, String> {
    let path = resolve_sample_video_path(&app, &resolution_label, &aspect_ratio).await?;
    Ok(path.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Batch run
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
enum BatchProgressEvent {
    #[serde(rename = "start")]
    Start,
    #[serde(rename = "file-start")]
    FileStart { index: u32, total: u32, file_name: String },
    #[serde(rename = "file-done")]
    FileDone { file_name: String, output_name: String },
    #[serde(rename = "file-failed")]
    FileFailed { file_name: String, message: String },
    #[serde(rename = "done")]
    Done { success: u32, failed: u32 },
}

async fn run_one(
    app: &AppHandle,
    input: &Path,
    output: &Path,
    logo_path: &str,
    profile: &LogoProfile,
    quality: &str,
    audio_mode: &str,
) -> Result<(), String> {
    let (preset, crf) = quality_args(quality);
    let filter = build_filter_complex(profile);

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-i".into(),
        input.to_string_lossy().to_string(),
        "-i".into(),
        logo_path.into(),
        "-filter_complex".into(),
        filter,
    ];
    args.extend(audio_args(audio_mode));
    args.extend([
        "-c:v".into(),
        "libx264".into(),
        "-preset".into(),
        preset.into(),
        "-crf".into(),
        crf.into(),
        "-pix_fmt".into(),
        "yuv420p".into(),
    ]);
    args.push(output.to_string_lossy().to_string());

    let sidecar = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg sidecar nahi mila: {e}"))?;

    let result = sidecar
        .args(args)
        .output()
        .await
        .map_err(|e| format!("ffmpeg chalane mein masla: {e}"))?;

    if result.status.success() {
        Ok(())
    } else {
        let stderr_tail: String = String::from_utf8_lossy(&result.stderr)
            .lines()
            .rev()
            .take(6)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect::<Vec<_>>()
            .join(" | ");
        Err(if stderr_tail.trim().is_empty() {
            "ffmpeg fail ho gaya.".into()
        } else {
            stderr_tail
        })
    }
}

#[tauri::command]
pub async fn start_batch(
    app: AppHandle,
    settings: BatchSettings,
    profile: LogoProfile,
) -> Result<(), String> {
    let videos = list_video_files(&settings.input_folder)?;
    let output_folder = PathBuf::from(&settings.output_folder);
    fs::create_dir_all(&output_folder)
        .map_err(|e| format!("Output folder nahi ban saka: {e}"))?;

    let started_at = profiles::now_epoch_ms();
    let _ = app.emit("batch-progress", BatchProgressEvent::Start);

    if videos.is_empty() {
        let _ = app.emit(
            "batch-progress",
            BatchProgressEvent::Done { success: 0, failed: 0 },
        );
        let _ = profiles::append_history(
            &app,
            HistoryRecord {
                id: profiles::new_history_id(),
                project_name: settings.project_name.clone(),
                input_folder: settings.input_folder.clone(),
                output_folder: settings.output_folder.clone(),
                profile_name: profile.name.clone(),
                quality: settings.quality.clone(),
                audio_mode: settings.audio_mode.clone(),
                started_at,
                finished_at: profiles::now_epoch_ms(),
                success: 0,
                failed: 0,
                files: vec![],
            },
        );
        return Ok(());
    }

    let padding = settings.number_padding.max(1) as usize;
    let start_number = next_start_number(&output_folder, &settings.project_name);

    let mut success = 0u32;
    let mut failed = 0u32;
    let mut file_entries: Vec<HistoryFileEntry> = Vec::with_capacity(videos.len());

    for (i, video) in videos.iter().enumerate() {
        let file_name = video
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let number = start_number + i as u32;
        let ext = video
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("mp4")
            .to_lowercase();
        let output_name = format!(
            "{}_{:0width$}.{}",
            settings.project_name,
            number,
            ext,
            width = padding
        );
        let output_path = output_folder.join(&output_name);

        let _ = app.emit(
            "batch-progress",
            BatchProgressEvent::FileStart {
                index: i as u32 + 1,
                total: videos.len() as u32,
                file_name: file_name.clone(),
            },
        );

        match run_one(
            &app,
            video,
            &output_path,
            &settings.logo_path,
            &profile,
            &settings.quality,
            &settings.audio_mode,
        )
        .await
        {
            Ok(()) => {
                success += 1;
                file_entries.push(HistoryFileEntry {
                    input_name: file_name.clone(),
                    output_name: output_name.clone(),
                    status: "done".into(),
                    message: None,
                });
                let _ = app.emit(
                    "batch-progress",
                    BatchProgressEvent::FileDone {
                        file_name: file_name.clone(),
                        output_name,
                    },
                );
            }
            Err(message) => {
                failed += 1;
                file_entries.push(HistoryFileEntry {
                    input_name: file_name.clone(),
                    output_name: output_name.clone(),
                    status: "failed".into(),
                    message: Some(message.clone()),
                });
                let _ = app.emit(
                    "batch-progress",
                    BatchProgressEvent::FileFailed { file_name: file_name.clone(), message },
                );
            }
        }
    }

    let _ = app.emit("batch-progress", BatchProgressEvent::Done { success, failed });

    let _ = profiles::append_history(
        &app,
        HistoryRecord {
            id: profiles::new_history_id(),
            project_name: settings.project_name.clone(),
            input_folder: settings.input_folder.clone(),
            output_folder: settings.output_folder.clone(),
            profile_name: profile.name.clone(),
            quality: settings.quality.clone(),
            audio_mode: settings.audio_mode.clone(),
            started_at,
            finished_at: profiles::now_epoch_ms(),
            success,
            failed,
            files: file_entries,
        },
    );

    Ok(())
}
