"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  isEnabled as autostartIsEnabled,
  enable as autostartEnable,
  disable as autostartDisable,
} from "@tauri-apps/plugin-autostart";

import type {
  AppPreferences,
  BatchProgressEvent,
  BatchSettings,
  HistoryRecord,
  LogoProfile,
} from "./types";

// ---------------------------------------------------------------------------
// Folder / file pickers
// ---------------------------------------------------------------------------

export async function pickFolder(defaultPath?: string): Promise<string | null> {
  const result = await openDialog({
    directory: true,
    multiple: false,
    defaultPath,
  });
  if (Array.isArray(result)) return result[0] ?? null;
  return result ?? null;
}

export async function pickImageFile(defaultPath?: string): Promise<string | null> {
  const result = await openDialog({
    directory: false,
    multiple: false,
    defaultPath,
    filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (Array.isArray(result)) return result[0] ?? null;
  return result ?? null;
}

export async function pickVideoFile(defaultPath?: string): Promise<string | null> {
  const result = await openDialog({
    directory: false,
    multiple: false,
    defaultPath,
    filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "avi", "m4v", "webm"] }],
  });
  if (Array.isArray(result)) return result[0] ?? null;
  return result ?? null;
}

// ---------------------------------------------------------------------------
// Profiles (persisted as JSON in the app's config directory by the Rust side)
// ---------------------------------------------------------------------------

export function getProfiles(): Promise<LogoProfile[]> {
  return invoke("get_profiles");
}

export function saveProfile(profile: LogoProfile): Promise<LogoProfile[]> {
  return invoke("save_profile", { profile });
}

export function deleteProfile(id: string): Promise<LogoProfile[]> {
  return invoke("delete_profile", { id });
}

// ---------------------------------------------------------------------------
// Batch settings (last-used project name / folders / quality etc.)
// ---------------------------------------------------------------------------

export function getBatchSettings(): Promise<BatchSettings> {
  return invoke("get_batch_settings");
}

export function saveBatchSettings(settings: BatchSettings): Promise<void> {
  return invoke("save_batch_settings", { settings });
}

// ---------------------------------------------------------------------------
// Preview frame generation (for the position-picker canvas)
// ---------------------------------------------------------------------------

/** Default/sample video ka LOCAL FILE PATH (bundled/cached/downloaded).
 *  Pehle exact resolution label se try hota hai, phir aspect-ratio se fallback
 *  (isliye naye resolutions add karne ke liye har baar naya sample video nahi
 *  chahiye). Frontend ise `convertFileSrc()` se ek playable `<video src>` bana
 *  leta hai. */
export function getDefaultVideoPath(resolutionLabel: string, aspectRatio: string): Promise<string> {
  return invoke("get_default_video_path", { resolutionLabel, aspectRatio });
}

// ---------------------------------------------------------------------------
// Batch run
// ---------------------------------------------------------------------------

export interface StartBatchArgs {
  settings: BatchSettings;
  profile: LogoProfile;
}

export function startBatch(args: StartBatchArgs): Promise<void> {
  return invoke("start_batch", { settings: args.settings, profile: args.profile });
}

export function onBatchProgress(
  callback: (event: BatchProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<BatchProgressEvent>("batch-progress", (e) => callback(e.payload));
}

// ---------------------------------------------------------------------------
// Autostart (System startup pe app khud khulna)
// ---------------------------------------------------------------------------

export const autostart = {
  isEnabled: autostartIsEnabled,
  enable: autostartEnable,
  disable: autostartDisable,
};

// ---------------------------------------------------------------------------
// App info
// ---------------------------------------------------------------------------

export function getAppInfo(): Promise<{
  version: string;
  buildVersion: string;
  name: string;
  platform: string;
}> {
  return invoke("get_app_info");
}

// ---------------------------------------------------------------------------
// App preferences (language / theme / accent color)
// ---------------------------------------------------------------------------

export function getAppPreferences(): Promise<AppPreferences> {
  return invoke("get_app_preferences");
}

export function saveAppPreferences(preferences: AppPreferences): Promise<void> {
  return invoke("save_app_preferences", { preferences });
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export function getHistory(): Promise<HistoryRecord[]> {
  return invoke("get_history");
}

export function clearHistory(): Promise<void> {
  return invoke("clear_history");
}
