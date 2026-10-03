"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  autostart,
  getAppPreferences,
  onBatchProgress,
  saveAppPreferences,
} from "@/lib/tauri-api";
import { localeDir, translate, type TranslationKey } from "@/locales";
import { ACCENT_COLORS } from "@/lib/accent-colors";
import type {
  AppPreferences,
  BatchProgressEvent,
  Language,
  ThemeMode,
} from "@/lib/types";

const DEFAULT_PREFERENCES: AppPreferences = {
  language: "en",
  themeMode: "dark",
  accentColor: "#7c5cff",
  autostartDefaultApplied: false,
};

type BatchStatus = "idle" | "running";

interface AppContextValue {
  preferences: AppPreferences;
  setLanguage: (language: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  batchStatus: BatchStatus;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function applyTheme(mode: ThemeMode, accentColor: string) {
  if (typeof document === "undefined") return;
  const resolved =
    mode === "system" ? (resolveSystemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.setProperty("--accent", accentColor);
  const contrast =
    ACCENT_COLORS.find((c) => c.value === accentColor)?.contrast ?? "#ffffff";
  document.documentElement.style.setProperty("--accent-contrast", contrast);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] =
    useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>("idle");
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getAppPreferences()
      .then(async (p) => {
        const merged = { ...DEFAULT_PREFERENCES, ...p };
        setPreferences(merged);

        // Pehli baar app khulne pe autostart khud-ba-khud ON kar do (agar
        // pehle kabhi apply nahi hua). Baad mein user khud disable kare to
        // ye dobara force-on nahi hota.
        if (!merged.autostartDefaultApplied) {
          try {
            await autostart.enable();
          } catch {
            // best-effort — koi mushkil aaye to chup chap aage badho
          }
          setPreferences((prev) => ({
            ...prev,
            autostartDefaultApplied: true,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    onBatchProgress((e: BatchProgressEvent) => {
      if (e.kind === "start") setBatchStatus("running");
      else if (e.kind === "done") setBatchStatus("idle");
    }).then((un) => {
      unlistenRef.current = un;
    });

    return () => unlistenRef.current?.();
  }, []);

  useEffect(() => {
    applyTheme(preferences.themeMode, preferences.accentColor);
    if (preferences.themeMode !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handler = () =>
      applyTheme(preferences.themeMode, preferences.accentColor);
    mq?.addEventListener("change", handler);
    return () => mq?.removeEventListener("change", handler);
  }, [preferences.themeMode, preferences.accentColor]);

  useEffect(() => {
    document.documentElement.dir = localeDir(preferences.language);
  }, [preferences.language]);

  useEffect(() => {
    if (!loaded) return;
    saveAppPreferences(preferences).catch(() => {});
  }, [preferences, loaded]);

  const setLanguage = useCallback((language: Language) => {
    setPreferences((p) => ({ ...p, language }));
  }, []);
  const setThemeMode = useCallback((themeMode: ThemeMode) => {
    setPreferences((p) => ({ ...p, themeMode }));
  }, []);
  const setAccentColor = useCallback((accentColor: string) => {
    setPreferences((p) => ({ ...p, accentColor }));
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(preferences.language, key, params),
    [preferences.language],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      preferences,
      setLanguage,
      setThemeMode,
      setAccentColor,
      t,
      batchStatus,
    }),
    [preferences, setLanguage, setThemeMode, setAccentColor, t, batchStatus],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProviders");
  return ctx;
}
