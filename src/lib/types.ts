/**
 * Ek "Layout Profile" ek screen-size/aspect-ratio ke liye logo ki placement
 * define karta hai. Position aur size dono PERCENTAGE mein store hote hain
 * (0 se 1 ke beech), taake ye kisi bhi actual video resolution pe theek se
 * scale ho jaye — chahe video ka exact resolution reference resolution se
 * thora mismatch bhi ho (jab tak aspect ratio same ho).
 */
import type { TranslationKey } from "@/locales";

export interface LogoProfile {
  id: string;
  name: string; // e.g. "Reels 9:16", "YouTube 16:9"
  resolutionLabel: string; // display only, e.g. "1080x1920"
  refWidth: number;
  refHeight: number;

  /** Logo ki width, main video ki width ka kitna percent ho (0-1). */
  logoWidthPercent: number;

  /** Logo ke top-left corner ki position, available space ka percent (0-1 each). */
  posXPercent: number;
  posYPercent: number;

  /** 0 = invisible, 1 = fully solid. */
  opacity: number;

  /** Profile ke sath saved logo image path — Home page auto-fill karta hai. */
  logoPath: string;

  createdAt: string;
  updatedAt: string;
}

export type QualityPreset = "fast" | "high" | "ultra" | "lossless";

export type AudioMode = "copy" | "reencode_aac";

export interface BatchSettings {
  projectName: string;
  inputFolder: string;
  outputFolder: string;
  logoPath: string;
  activeProfileId: string | null;
  quality: QualityPreset;
  audioMode: AudioMode;
  /** Number padding for output filenames, e.g. 3 -> 001, 002 ... */
  numberPadding: number;
}

export interface BatchProgressEvent {
  kind: "start" | "file-start" | "file-done" | "file-failed" | "done";
  index?: number;
  total?: number;
  fileName?: string;
  outputName?: string;
  message?: string;
  success?: number;
  failed?: number;
}

export const QUALITY_KEYS: Record<QualityPreset, TranslationKey> = {
  fast: "quality.fast",
  high: "quality.high",
  ultra: "quality.ultra",
  lossless: "quality.lossless",
};

export const AUDIO_KEYS: Record<AudioMode, TranslationKey> = {
  copy: "audio.copy",
  reencode_aac: "audio.reencode_aac",
};

// ---------------------------------------------------------------------------
// App-wide preferences (language / theme / accent color)
// ---------------------------------------------------------------------------

export type { Language } from "@/locales";
import type { Language } from "@/locales";
export type ThemeMode = "dark" | "light" | "system";

export interface AppPreferences {
  language: Language;
  themeMode: ThemeMode;
  accentColor: string;
  autostartDefaultApplied: boolean;
}

// ---------------------------------------------------------------------------
// Batch history
// ---------------------------------------------------------------------------

export interface HistoryFileEntry {
  inputName: string;
  outputName: string;
  status: "done" | "failed";
  message?: string | null;
}

export interface HistoryRecord {
  id: string;
  projectName: string;
  inputFolder: string;
  outputFolder: string;
  profileName: string;
  quality: string;
  audioMode: string;
  startedAt: number;
  finishedAt: number;
  success: number;
  failed: number;
  files: HistoryFileEntry[];
}
