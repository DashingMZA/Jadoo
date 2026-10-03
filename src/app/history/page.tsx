"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { clearHistory, getHistory } from "@/lib/tauri-api";
import type { HistoryRecord } from "@/lib/types";

export default function HistoryPage() {
  const { t } = useAppContext();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    getHistory()
      .then(setRecords)
      .finally(() => setLoading(false));
  }

  async function handleClear() {
    if (!confirm(t("history.confirmClear"))) return;
    await clearHistory();
    refresh();
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">{t("history.title")}</h1>
          <p className="page-subtitle">{t("history.subtitle")}</p>
        </div>
        {records.length > 0 && (
          <button className="danger" onClick={handleClear}>
            {t("history.clear")}
          </button>
        )}
      </div>

      <div className="card">
        {loading && <p className="hint">{t("common.loading")}</p>}
        {!loading && records.length === 0 && (
          <p className="hint">{t("history.noRuns")}</p>
        )}
        {records.map((r) => {
          const isOpen = expanded === r.id;
          return (
            <div className="history-item" key={r.id}>
              <div
                className="history-header"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <div>
                  <strong>{r.projectName || t("history.noName")}</strong>{" "}
                  <span className="hint">
                    — {new Date(r.startedAt).toLocaleString()}
                  </span>
                  <div className="hint">
                    {t("history.metaLine", {
                      profile: r.profileName,
                      quality: r.quality,
                      audio: r.audioMode,
                    })}
                  </div>
                </div>
                <div>
                  <span className="badge success">
                    {t("history.done", { n: r.success })}
                  </span>{" "}
                  {r.failed > 0 && (
                    <span className="badge danger">
                      {t("history.failed", { n: r.failed })}
                    </span>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="history-files">
                  <p className="hint">
                    {t("history.input")}{" "}
                    <span className="donation-addr">{r.inputFolder}</span>
                  </p>
                  <p className="hint">
                    {t("history.output")}{" "}
                    <span className="donation-addr">{r.outputFolder}</span>
                  </p>
                  {r.files.length > 0 && (
                    <div className="progress-list" style={{ marginTop: 8 }}>
                      {r.files.map((f, i) => (
                        <div className="progress-row" key={i}>
                          <span>
                            {f.inputName} → {f.outputName}
                          </span>
                          <span
                            className={
                              "badge " +
                              (f.status === "done" ? "success" : "danger")
                            }
                          >
                            {f.status === "done"
                              ? t("file.done")
                              : t("file.failed")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
