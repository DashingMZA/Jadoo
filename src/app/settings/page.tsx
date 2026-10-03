"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { LOCALES } from "@/locales";
import { ACCENT_COLORS } from "@/lib/accent-colors";
import { autostart, getAppInfo } from "@/lib/tauri-api";
import type { Language } from "@/lib/types";
import type { TranslationKey } from "@/locales";

export default function SettingsPage() {
  const { t, preferences, setLanguage, setAccentColor } = useAppContext();
  const [autostartEnabled, setAutostartEnabled] = useState<boolean | null>(
    null,
  );
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    autostart
      .isEnabled()
      .then(setAutostartEnabled)
      .catch(() => setAutostartEnabled(null));
    getAppInfo()
      .then((info) => setPlatform(info.platform))
      .catch(() => {});
  }, []);

  async function toggleAutostart() {
    if (autostartEnabled === null) return;
    if (autostartEnabled) {
      await autostart.disable();
      setAutostartEnabled(false);
    } else {
      await autostart.enable();
      setAutostartEnabled(true);
    }
  }

  return (
    <div>
      <h1 className="page-title">{t("settings.title")}</h1>
      <p className="page-subtitle">{t("settings.subtitle")}</p>

      <div className="card">
        <strong>{t("settings.language")}</strong>
        <div className="field" style={{ marginTop: 12 }}>
          <label>{t("settings.interfaceLanguage")}</label>
          <select
            value={preferences.language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <strong>{t("settings.accentColor")}</strong>
        <p className="hint" style={{ marginBottom: 12 }}>
          {t("settings.accentColorSubtitle")}
        </p>
        <div className="color-swatch-row">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={t(c.key as TranslationKey)}
              className={
                "color-swatch" +
                (preferences.accentColor === c.value ? " selected" : "")
              }
              style={{ background: c.value }}
              onClick={() => setAccentColor(c.value)}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <strong>{t("settings.startup")}</strong>
        <p className="hint" style={{ marginBottom: 10 }}>
          {t("settings.startupHint")}
        </p>
        <p className="hint" style={{ marginBottom: 10 }}>
          {platform === "macos"
            ? t("settings.startupMac")
            : platform === "windows"
              ? t("settings.startupWindows")
              : t("settings.startupOther")}
        </p>
        <button onClick={toggleAutostart} disabled={autostartEnabled === null}>
          {autostartEnabled === null
            ? t("common.loading")
            : autostartEnabled
              ? t("settings.disableStartup")
              : t("settings.enableStartup")}
        </button>
      </div>
    </div>
  );
}
