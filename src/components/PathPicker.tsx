"use client";

import { useAppContext } from "@/context/AppContext";
import { pickFolder, pickImageFile, pickVideoFile } from "@/lib/tauri-api";

interface PathPickerProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  kind: "folder" | "image" | "video";
  placeholder?: string;
}

export function PathPicker({
  label,
  value,
  onChange,
  kind,
  placeholder,
}: PathPickerProps) {
  const { t } = useAppContext();

  async function browse() {
    let result: string | null = null;
    if (kind === "folder") result = await pickFolder(value || undefined);
    else if (kind === "image") result = await pickImageFile(value || undefined);
    else result = await pickVideoFile(value || undefined);

    if (result) onChange(result);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="field-row">
        <div className="field">
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <button type="button" onClick={browse}>
          {t("common.browse")}
        </button>
      </div>
    </div>
  );
}
