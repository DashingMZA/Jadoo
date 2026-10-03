"use client";

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { onBatchProgress, startBatch } from "@/lib/tauri-api";
import type {
  BatchProgressEvent,
  BatchSettings,
  LogoProfile,
} from "@/lib/types";

interface BatchRunnerProps {
  settings: BatchSettings;
  profile: LogoProfile | null;
}

interface Row {
  fileName: string;
  outputName?: string;
  status: "running" | "done" | "failed";
  message?: string;
}

export function BatchRunner({ settings, profile }: BatchRunnerProps) {
  const { t } = useAppContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onBatchProgress(handleEvent).then((un) => {
      unlistenRef.current = un;
    });
    return () => {
      unlistenRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEvent(e: BatchProgressEvent) {
    if (e.kind === "start") {
      setRows([]);
      setSummary(null);
      setError(null);
      setRunning(true);
    } else if (e.kind === "file-start") {
      setRows((prev) => [
        ...prev,
        { fileName: e.fileName ?? "", status: "running" },
      ]);
    } else if (e.kind === "file-done") {
      setRows((prev) =>
        updateLast(prev, e.fileName, {
          status: "done",
          outputName: e.outputName,
        }),
      );
    } else if (e.kind === "file-failed") {
      setRows((prev) =>
        updateLast(prev, e.fileName, { status: "failed", message: e.message }),
      );
    } else if (e.kind === "done") {
      setRunning(false);
      setSummary({ success: e.success ?? 0, failed: e.failed ?? 0 });
    }
  }

  function updateLast(
    prev: Row[],
    fileName: string | undefined,
    patch: Partial<Row>,
  ) {
    const idx = [...prev]
      .reverse()
      .findIndex((r) => r.fileName === fileName && r.status === "running");
    if (idx === -1) return prev;
    const realIdx = prev.length - 1 - idx;
    const copy = [...prev];
    copy[realIdx] = { ...copy[realIdx], ...patch };
    return copy;
  }

  const canStart =
    !running &&
    !!profile &&
    !!settings.projectName &&
    !!settings.inputFolder &&
    !!settings.outputFolder &&
    !!settings.logoPath;

  async function handleStart() {
    if (!profile) return;
    setRunning(true);
    try {
      await startBatch({ settings, profile });
    } catch (err) {
      setRunning(false);
      setError(String(err));
    }
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <strong>{t("batchRunner.title")}</strong>
        <button className="primary" onClick={handleStart} disabled={!canStart}>
          {running ? t("batchRunner.processing") : t("batchRunner.start")}
        </button>
      </div>

      {!profile && <p className="hint">{t("batchRunner.selectProfileHint")}</p>}

      {rows.length > 0 && (
        <div className="progress-list">
          {rows.map((r, i) => (
            <div className="progress-row" key={i}>
              <span>
                {r.fileName}
                {r.outputName ? ` → ${r.outputName}` : ""}
              </span>
              <span
                className={
                  "badge " +
                  (r.status === "done"
                    ? "success"
                    : r.status === "failed"
                      ? "danger"
                      : "")
                }
              >
                {r.status === "running"
                  ? "…"
                  : r.status === "done"
                    ? t("file.done")
                    : t("file.failed")}
              </span>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <p className="hint" style={{ marginTop: 10 }}>
          {t("batchRunner.summary", {
            total: summary.success + summary.failed,
            success: summary.success,
            failed: summary.failed,
          })}
        </p>
      )}
      {error && (
        <p className="hint" style={{ marginTop: 10 }}>
          {t("batchRunner.error", { message: error })}
        </p>
      )}
    </div>
  );
}
