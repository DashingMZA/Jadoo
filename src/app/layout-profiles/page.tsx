"use client";

import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";
import { LogoPositionPicker } from "@/components/LogoPositionPicker";
import { PathPicker } from "@/components/PathPicker";
import {
  deleteProfile,
  getDefaultVideoPath,
  getProfiles,
  pickVideoFile,
  saveProfile,
} from "@/lib/tauri-api";
import {
  COMMON_RESOLUTIONS,
  RESOLUTION_GROUPS,
  getAspectForResolution,
} from "@/lib/resolutions";
import type { LogoProfile } from "@/lib/types";

function blankProfile(): LogoProfile {
  const res = COMMON_RESOLUTIONS[0];
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    resolutionLabel: res.label,
    refWidth: res.width,
    refHeight: res.height,
    logoWidthPercent: 0.15,
    posXPercent: 0.85,
    posYPercent: 0.9,
    opacity: 0.8,
    logoPath: "",
    createdAt: now,
    updatedAt: now,
  };
}

export default function LayoutProfilesPage() {
  const { t } = useAppContext();
  const [profiles, setProfiles] = useState<LogoProfile[]>([]);
  const [draft, setDraft] = useState<LogoProfile>(blankProfile());
  const [previewVideoSrc, setPreviewVideoSrc] = useState<string | null>(null);
  const [previewIsCustom, setPreviewIsCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfiles().then(setProfiles);
  }, []);

  // Resolution badalte hi (aur pehli baar load hote hi) default sample video
  // ka preview auto-load karo — jab tak user ne khud koi video pick na ki ho.
  useEffect(() => {
    if (previewIsCustom) return;
    let cancelled = false;
    const aspect = getAspectForResolution(
      draft.resolutionLabel,
      draft.refWidth,
      draft.refHeight,
    );
    getDefaultVideoPath(draft.resolutionLabel, aspect ?? "")
      .then((path) => {
        if (!cancelled) setPreviewVideoSrc(convertFileSrc(path));
      })
      .catch(() => {
        if (!cancelled) setPreviewVideoSrc(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.resolutionLabel, previewIsCustom]);

  function loadForEdit(p: LogoProfile) {
    setDraft(p);
    setPreviewIsCustom(false);
  }

  function newProfile() {
    setDraft(blankProfile());
    setPreviewIsCustom(false);
  }

  function applyResolution(label: string) {
    const res = COMMON_RESOLUTIONS.find((r) => r.label === label);
    if (!res) return;
    setDraft((d) => ({
      ...d,
      resolutionLabel: res.label,
      refWidth: res.width,
      refHeight: res.height,
    }));
  }

  async function loadCustomPreviewVideo() {
    const path = await pickVideoFile();
    if (!path) return;
    setPreviewIsCustom(true);
    setPreviewVideoSrc(convertFileSrc(path));
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      alert(t("layoutProfiles.alertNameRequired"));
      return;
    }
    setSaving(true);
    try {
      const updated = await saveProfile({
        ...draft,
        updatedAt: new Date().toISOString(),
      });
      setProfiles(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsNew() {
    setDraft((d) => ({ ...d, id: crypto.randomUUID() }));
    // Agla render ke baad user "Save Profile" dabayega to naye id ke sath save hoga.
  }

  async function handleDelete(id: string) {
    if (!confirm(t("layoutProfiles.confirmDelete"))) return;
    const updated = await deleteProfile(id);
    setProfiles(updated);
    if (draft.id === id) newProfile();
  }

  return (
    <div>
      <h1 className="page-title">{t("layoutProfiles.title")}</h1>
      <p className="page-subtitle">{t("layoutProfiles.subtitle")}</p>

      <div className="grid-2">
        <div>
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <strong>{t("layoutProfiles.savedProfiles")}</strong>
              <button type="button" onClick={newProfile}>
                {t("layoutProfiles.newProfile")}
              </button>
            </div>
            {profiles.length === 0 && (
              <p className="hint">{t("layoutProfiles.noProfilesSaved")}</p>
            )}
            {profiles.map((p) => (
              <div
                key={p.id}
                className="progress-row"
                style={{ cursor: "pointer" }}
                onClick={() => loadForEdit(p)}
              >
                <span>
                  {p.name} <span className="hint">({p.resolutionLabel})</span>
                </span>
                <button
                  type="button"
                  className="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="field">
              <label>{t("layoutProfiles.profileName")}</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder={t("layoutProfiles.profileNamePlaceholder")}
              />
            </div>

            <div className="field">
              <label>{t("layoutProfiles.screenSize")}</label>
              <select
                value={draft.resolutionLabel}
                onChange={(e) => applyResolution(e.target.value)}
              >
                {RESOLUTION_GROUPS.map((group) => (
                  <optgroup
                    key={group}
                    label={
                      group === "General" ? t("resolutionGroup.general") : group
                    }
                  >
                    {COMMON_RESOLUTIONS.filter((r) => r.group === group).map(
                      (r) => (
                        <option key={r.label} value={r.label}>
                          {r.label}
                        </option>
                      ),
                    )}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label>{t("layoutProfiles.widthCustom")}</label>
                <input
                  type="number"
                  value={draft.refWidth}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      refWidth: parseInt(e.target.value, 10) || d.refWidth,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>{t("layoutProfiles.heightCustom")}</label>
                <input
                  type="number"
                  value={draft.refHeight}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      refHeight: parseInt(e.target.value, 10) || d.refHeight,
                    }))
                  }
                />
              </div>
            </div>

            <PathPicker
              label={t("layoutProfiles.logoImageSavedHint")}
              kind="image"
              value={draft.logoPath}
              onChange={(v) => setDraft((d) => ({ ...d, logoPath: v }))}
            />

            <div className="field">
              <label>
                {t("layoutProfiles.logoSize", {
                  pct: Math.round(draft.logoWidthPercent * 100),
                })}
              </label>
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={draft.logoWidthPercent}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    logoWidthPercent: parseFloat(e.target.value),
                  }))
                }
              />
              <p className="hint">{t("layoutProfiles.logoSizeHint")}</p>
            </div>

            <div className="field">
              <label>
                {t("layoutProfiles.transparency", {
                  pct: Math.round(draft.opacity * 100),
                })}
              </label>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={draft.opacity}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    opacity: parseFloat(e.target.value),
                  }))
                }
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? t("layoutProfiles.saving")
                  : t("layoutProfiles.saveProfile")}
              </button>
              <button onClick={handleSaveAsNew}>
                {t("layoutProfiles.saveAsNew")}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <strong>{t("layoutProfiles.positionPreview")}</strong>
            <p className="hint" style={{ marginBottom: 10 }}>
              {t("layoutProfiles.positionPreviewHint", {
                w: draft.refWidth,
                h: draft.refHeight,
              })}
            </p>
            <LogoPositionPicker
              refWidth={draft.refWidth}
              refHeight={draft.refHeight}
              logoPath={draft.logoPath}
              previewVideoSrc={previewVideoSrc}
              logoWidthPercent={draft.logoWidthPercent}
              posXPercent={draft.posXPercent}
              posYPercent={draft.posYPercent}
              opacity={draft.opacity}
              onChangePosition={(x, y) =>
                setDraft((d) => ({ ...d, posXPercent: x, posYPercent: y }))
              }
            />
            <button
              type="button"
              onClick={loadCustomPreviewVideo}
              style={{ marginTop: 10 }}
            >
              {t("layoutProfiles.pickOwnVideo")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
