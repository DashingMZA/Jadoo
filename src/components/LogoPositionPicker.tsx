"use client";

import { useCallback, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppContext } from "@/context/AppContext";

interface LogoPositionPickerProps {
  refWidth: number;
  refHeight: number;
  logoPath: string;
  /** convertFileSrc()'d URL of the sample/preview video, or null if none resolved yet. */
  previewVideoSrc: string | null;
  logoWidthPercent: number;
  posXPercent: number;
  posYPercent: number;
  opacity: number;
  onChangePosition: (x: number, y: number) => void;
}

const STAGE_WIDTH = 320;

/**
 * Ek preview "screen" dikhata hai — jisme asal sample video CHALTI hai (static
 * frame nahi), taake user dekh sake ke logo sahi lag raha hai ya nahi. Logo
 * ko click/drag karke kahin bhi place kiya ja sakta hai. Position percentage
 * mein store hoti hai (0 = top/left edge, 1 = bottom/right edge of the
 * available space), isliye ye kisi bhi actual video resolution pe theek se
 * scale hogi.
 */
export function LogoPositionPicker({
  refWidth,
  refHeight,
  logoPath,
  previewVideoSrc,
  logoWidthPercent,
  posXPercent,
  posYPercent,
  opacity,
  onChangePosition,
}: LogoPositionPickerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const { t } = useAppContext();
  // Actual rendered logo aspect ratio, learned once the image loads.
  const [logoAspect, setLogoAspect] = useState(1); // height / width

  const stageHeight = STAGE_WIDTH * (refHeight / refWidth);
  const logoBoxWidth = STAGE_WIDTH * logoWidthPercent;
  const logoBoxHeight = logoBoxWidth * logoAspect;

  const availW = Math.max(STAGE_WIDTH - logoBoxWidth, 1);
  const availH = Math.max(stageHeight - logoBoxHeight, 1);

  const left = posXPercent * availW;
  const top = posYPercent * availH;

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();

      const rawX = clientX - rect.left - logoBoxWidth / 2;
      const rawY = clientY - rect.top - logoBoxHeight / 2;

      const x = Math.min(Math.max(rawX / availW, 0), 1);
      const y = Math.min(Math.max(rawY / availH, 0), 1);
      onChangePosition(x, y);
    },
    [availH, availW, logoBoxHeight, logoBoxWidth, onChangePosition],
  );

  return (
    <div>
      <div
        ref={stageRef}
        onPointerDown={(e) => {
          setDragging(true);
          (e.target as Element).setPointerCapture(e.pointerId);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        style={{
          position: "relative",
          width: STAGE_WIDTH,
          height: stageHeight,
          background: previewVideoSrc
            ? "black"
            : "repeating-linear-gradient(45deg, #23252e, #23252e 10px, #1c1e25 10px, #1c1e25 20px)",
          borderRadius: 8,
          border: "1px solid var(--border)",
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        {previewVideoSrc ? (
          <video
            key={previewVideoSrc}
            src={previewVideoSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: 11,
              textAlign: "center",
              padding: 8,
              whiteSpace: "pre-line",
            }}
          >
            {t("logoPicker.noPreview", { w: refWidth, h: refHeight })}
          </div>
        )}

        {logoPath && (
          <img
            src={convertFileSrc(logoPath)}
            alt="logo"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0) {
                setLogoAspect(img.naturalHeight / img.naturalWidth);
              }
            }}
            style={{
              position: "absolute",
              width: logoBoxWidth,
              left,
              top,
              opacity,
              pointerEvents: "none",
              filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))",
            }}
          />
        )}
      </div>
      <p className="hint">{t("logoPicker.dragHint")}</p>
    </div>
  );
}
