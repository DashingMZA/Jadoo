"use client";

import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppContext } from "@/context/AppContext";
import { CRYPTO_OPTIONS, LINK_OPTIONS, isConfigured } from "@/lib/donation";

type Tab = "crypto" | "other";

export default function DonatePage() {
  const { t } = useAppContext();
  const [tab, setTab] = useState<Tab>("crypto");
  const [copied, setCopied] = useState<string | null>(null);

  async function copyAddress(address: string) {
    await writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <h1 className="page-title">{t("donate.title")}</h1>
      <p className="page-subtitle">{t("donate.subtitle")}</p>

      <div className="tab-row">
        <button className={tab === "crypto" ? "active" : ""} onClick={() => setTab("crypto")}>
          {t("donate.crypto")}
        </button>
        <button className={tab === "other" ? "active" : ""} onClick={() => setTab("other")}>
          {t("donate.other")}
        </button>
      </div>

      {tab === "crypto" && (
        <div className="card">
          {CRYPTO_OPTIONS.map((c, i) => {
            const configured = isConfigured(c.address);
            return (
              <div
                className="donation-item"
                key={i}
                style={{
                  borderBottom:
                    i < CRYPTO_OPTIONS.length - 1 ? "1px solid var(--border)" : "none",
                  padding: "10px 0",
                }}
              >
                <div>
                  <div>
                    <strong>{c.coin}</strong>{" "}
                    {c.network && <span className="hint">· {c.network}</span>}
                  </div>
                  <div className="donation-addr">
                    {configured ? c.address : t("donate.notSetUp")}
                  </div>
                </div>
                <button type="button" onClick={() => copyAddress(c.address)} disabled={!configured}>
                  {copied === c.address ? t("donate.copied") : t("donate.copyAddress")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "other" && (
        <div className="card">
          {LINK_OPTIONS.map((l, i) => (
            <div
              key={l.id}
              className="donation-item"
              style={{
                borderBottom: i < LINK_OPTIONS.length - 1 ? "1px solid var(--border)" : "none",
                padding: "10px 0",
              }}
            >
              <div>
                <div>
                  <strong>{l.label}</strong>
                </div>
                <div className="donation-addr">{l.url}</div>
              </div>
              <button type="button" onClick={() => openUrl(l.url)}>
                {t("donate.open")}
              </button>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 12, textAlign: "center" }}>
            {t("donate.thankYou")}
          </p>
        </div>
      )}
    </div>
  );
}
