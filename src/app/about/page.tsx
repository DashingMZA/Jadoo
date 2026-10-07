"use client";

import { useEffect, useState } from "react";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { getAppInfo } from "@/lib/tauri-api";
import { SOCIAL_LINKS } from "@/lib/social";
import { SUPPORT_EMAIL, ContactSendError, sendContactMessage } from "@/lib/contact";

type Tab = "app" | "social" | "contact";

export default function AboutPage() {
  const { t } = useAppContext();
  const [tab, setTab] = useState<Tab>("app");

  return (
    <div>
      <h1 className="page-title">{t("about.title")}</h1>
      <p className="page-subtitle">{t("about.subtitle")}</p>

      <div className="tab-row">
        <button className={tab === "app" ? "active" : ""} onClick={() => setTab("app")}>
          {t("about.tabApp")}
        </button>
        <button className={tab === "social" ? "active" : ""} onClick={() => setTab("social")}>
          {t("about.tabSocial")}
        </button>
        <button className={tab === "contact" ? "active" : ""} onClick={() => setTab("contact")}>
          {t("about.tabContact")}
        </button>
      </div>

      {tab === "app" && <AppTab />}
      {tab === "social" && <SocialTab />}
      {tab === "contact" && <ContactTab />}
    </div>
  );
}

function AppTab() {
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
    <>
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
          <div className="hint">{appInfo?.buildVersion || "…"}</div>
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
    </>
  );
}

function SocialTab() {
  const { t } = useAppContext();
  return (
    <div className="card">
      <strong>{t("about.tabSocial")}</strong>
      <p className="hint" style={{ marginBottom: 14 }}>{t("social.subtitle")}</p>
      <div className="social-grid">
        {SOCIAL_LINKS.map((link) => (
          <button
            key={link.id}
            className="social-pill"
            style={{ ["--social-color" as string]: link.color }}
            onClick={() => openUrl(link.href)}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ContactTab() {
  const { t } = useAppContext();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await sendContactMessage({ name, email, message });
      showToast(t("contact.success"));
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      if (err instanceof ContactSendError && err.code === "SETUP_REQUIRED") {
        setError(t("contact.setupRequired"));
      } else if (err instanceof Error && err.message === "Please fill in all fields.") {
        setError(t("contact.fillAllFields"));
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <strong>{t("about.tabContact")}</strong>
      <p className="hint" style={{ marginBottom: 14 }}>{t("contact.subtitle")}</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>{t("contact.name")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("contact.email")}</label>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("contact.message")}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: "13.5px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
        {error && <p className="hint" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="primary" type="submit" disabled={sending}>
          {sending ? t("contact.sending") : t("contact.send")}
        </button>
      </form>

      <p className="hint" style={{ marginTop: 16 }}>
        {t("contact.emailLabel")}{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </div>
  );
}
