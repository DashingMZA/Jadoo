"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";
import { PathPicker } from "@/components/PathPicker";
import { LogoPositionPicker } from "@/components/LogoPositionPicker";
import { BatchRunner } from "@/components/BatchRunner";
import {
  getBatchSettings,
  getDefaultVideoPath,
  getProfiles,
  saveBatchSettings,
} from "@/lib/tauri-api";
import {
  AUDIO_KEYS,
  QUALITY_KEYS,
  type AudioMode,
  type BatchSettings,
  type LogoProfile,
  type QualityPreset,
} from "@/lib/types";
import { getAspectForResolution } from "@/lib/resolutions";

const DEFAULT_SETTINGS: BatchSettings = {
  projectName: "",
  inputFolder: "",
  outputFolder: "",
  logoPath: "",
  activeProfileId: null,
  quality: "high",
  audioMode: "copy",
  numberPadding: 3,
};

export default function HomePage() {
  const { t } = useAppContext();
  const [settings, setSettings] = useState<BatchSettings>(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState<LogoProfile[]>([]);
  const [logoPathOverride, setLogoPathOverride] = useState("");
  const [opacityOverride, setOpacityOverride] = useState(0.6);
  const [previewVideoSrc, setPreviewVideoSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const lastProfileId = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([getBatchSettings(), getProfiles()]);
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setProfiles(p);
      setLoaded(true);
    })();
  }, []);

  // Persist settings once loaded
  useEffect(() => {
    if (!loaded) return;
    saveBatchSettings(settings).catch(() => {});
  }, [settings, loaded]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === settings.activeProfileId) ?? null,
    [profiles, settings.activeProfileId],
  );

  // Jab profile badle (ya pehli baar load ho), logo path + transparency ko
  // profile ki saved values se auto-fill karo. User neeche se ye override
  // kar sakta hai — us override ko is profile-switch ke baad tak yaad rakha
  // jata hai (jab tak dobara profile na badle).
  useEffect(() => {
    if (!activeProfile) return;
    if (lastProfileId.current === activeProfile.id) return;
    lastProfileId.current = activeProfile.id;
    setLogoPathOverride(activeProfile.logoPath);
    setOpacityOverride(activeProfile.opacity);
  }, [activeProfile]);

  // Sirf default/sample video se preview — koi manual file-picker nahi. Ye
  // ab asal video FILE hai (frame-extract nahi), isliye play bhi hoti hai.
  useEffect(() => {
    if (!activeProfile) {
      setPreviewVideoSrc(null);
      return;
    }
    let cancelled = false;
    const aspect = getAspectForResolution(
      activeProfile.resolutionLabel,
      activeProfile.refWidth,
      activeProfile.refHeight,
    );
    getDefaultVideoPath(activeProfile.resolutionLabel, aspect ?? "")
      .then((path) => {
        if (!cancelled) setPreviewVideoSrc(convertFileSrc(path));
      })
      .catch(() => {
        if (!cancelled) setPreviewVideoSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProfile]);

  // settings.logoPath ko override ke sath sync rakho (batch isi se run hoti hai)
  useEffect(() => {
    setSettings((s) => (s.logoPath === logoPathOverride ? s : { ...s, logoPath: logoPathOverride }));
  }, [logoPathOverride]);

  const effectiveProfile: LogoProfile | null = activeProfile
    ? { ...activeProfile, opacity: opacityOverride, logoPath: logoPathOverride }
    : null;

  return (
    <div>
      <h1 className="page-title">{t("home.title")}</h1>
      <p className="page-subtitle">{t("home.subtitle")}</p>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="field">
              <label>{t("home.projectName")}</label>
              <input
                type="text"
                value={settings.projectName}
                onChange={(e) => setSettings((s) => ({ ...s, projectName: e.target.value }))}
                placeholder={t("home.projectNamePlaceholder")}
              />
              <p className="hint">
                {t("home.outputFilesHint", { name: settings.projectName || "ProjectName" })}
              </p>
            </div>

            <PathPicker
              label={t("home.inputFolder")}
              kind="folder"
              value={settings.inputFolder}
              onChange={(v) => setSettings((s) => ({ ...s, inputFolder: v }))}
            />
            <PathPicker
              label={t("home.outputFolder")}
              kind="folder"
              value={settings.outputFolder}
              onChange={(v) => setSettings((s) => ({ ...s, outputFolder: v }))}
            />

            <div className="field">
              <label>{t("home.layoutProfile")}</label>
              <select
                value={settings.activeProfileId ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, activeProfileId: e.target.value || null }))
                }
              >
                <option value="">{t("home.selectProfilePlaceholder")}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.resolutionLabel})
                  </option>
                ))}
              </select>
              {profiles.length === 0 && <p className="hint">{t("home.noProfilesHint")}</p>}
            </div>

            {activeProfile && (
              <>
                <PathPicker
                  label={t("home.logoImageAutoHint")}
                  kind="image"
                  value={logoPathOverride}
                  onChange={setLogoPathOverride}
                />
                <div className="field">
                  <label>{t("home.transparencyAutoHint")}</label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={opacityOverride}
                    onChange={(e) => setOpacityOverride(parseFloat(e.target.value))}
                  />
                  <p className="hint">
                    {t("home.opaquePercent", { pct: Math.round(opacityOverride * 100) })}
                  </p>
                </div>
              </>
            )}

            <div className="field-row">
              <div className="field">
                <label>{t("home.quality")}</label>
                <select
                  value={settings.quality}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, quality: e.target.value as QualityPreset }))
                  }
                >
                  {Object.entries(QUALITY_KEYS).map(([k, key]) => (
                    <option key={k} value={k}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t("home.audio")}</label>
                <select
                  value={settings.audioMode}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, audioMode: e.target.value as AudioMode }))
                  }
                >
                  {Object.entries(AUDIO_KEYS).map(([k, key]) => (
                    <option key={k} value={k}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <BatchRunner settings={settings} profile={effectiveProfile} />
        </div>

        <div>
          <div className="card">
            <strong>{t("home.previewTitle")}</strong>
            <p className="hint" style={{ marginBottom: 10 }}>
              {activeProfile
                ? t("home.previewHint", { res: activeProfile.resolutionLabel, name: activeProfile.name })
                : t("home.previewSelectProfileFirst")}
            </p>

            {activeProfile && (
              <LogoPositionPicker
                refWidth={activeProfile.refWidth}
                refHeight={activeProfile.refHeight}
                logoPath={logoPathOverride}
                previewVideoSrc={previewVideoSrc}
                logoWidthPercent={activeProfile.logoWidthPercent}
                posXPercent={activeProfile.posXPercent}
                posYPercent={activeProfile.posYPercent}
                opacity={opacityOverride}
                onChangePosition={() => {
                  /* Read-only here — position edits happen on Layout Profiles page */
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
