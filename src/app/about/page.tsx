"use client";

import { useEffect, useState } from "react";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useAppContext } from "@/context/AppContext";
import { getAppInfo } from "@/lib/tauri-api";

export default function AboutPage() {
  const { t } = useAppContext();
  const [appInfo, setAppInfo] = useState<{
    version: string;
    buildVersion: string;
    name: string;
    platform: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [readyToRestart, setReadyToRestart] = useState(false);

  useEffect(() => {
    getAppInfo().then(setAppInfo).catch(() => {});
  }, []);

  async function handleCheckUpdate() {
    setChecking(true);
    setUpdateStatus(t("about.checking"));
    try {
      const update = await checkForUpdate();
      if (update?.available) {
        setUpdateStatus(t("about.updateAvailable", { version: update.version }));
        await update.downloadAndInstall();
        setUpdateStatus(t("about.updateInstalled"));
        setReadyToRestart(true);
      } else {
        setUpdateStatus(t("about.upToDate"));
      }
    } catch {
      setUpdateStatus(t("about.updateCheckFailed"));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">{t("about.title")}</h1>
      <p className="page-subtitle">{t("about.subtitle")}</p>

      <div className="card">
        <strong>{t("about.appInfo")}</strong>
        <div className="field" style={{ marginTop: 12 }}>
          <label>{t("about.name")}</label>
          <div>{appInfo?.name ?? "Jadoo"}</div>
        </div>
        <div className="field">
          <label>{t("about.version")}</label>
          <div>{appInfo?.version ?? "1.0.0"}</div>
        </div>
        <div className="field">
          <label>{t("about.build")}</label>
          <div className="hint">{appInfo?.buildVersion ?? "…"}</div>
        </div>
        <button onClick={handleCheckUpdate} disabled={checking}>
          {checking ? t("about.checking") : t("about.checkUpdates")}
        </button>
        {updateStatus && <p className="hint">{updateStatus}</p>}
        {readyToRestart && (
          <button className="primary" style={{ marginTop: 8 }} onClick={() => relaunch()}>
            {t("about.restartNow")}
          </button>
        )}
      </div>

      <div className="card">
        <strong>{t("about.owner")}</strong>
        <p style={{ marginTop: 8, marginBottom: 0 }}>Zaheer Ahmad</p>
        <p className="hint" style={{ marginTop: 4 }}>
          <a href="https://jadoo.bond" target="_blank" rel="noreferrer">
            jadoo.bond
          </a>
        </p>
      </div>
    </div>
  );
}
