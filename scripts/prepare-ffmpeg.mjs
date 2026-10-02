// `npm run app:dev` / `npm run app:build` se pehle chalta hai.
// User `src-tauri/binaries/ffmpeg.exe` aur `ffprobe.exe` plain naam ke sath
// rakhta hai; Tauri sidecars ko naam ke aage target-triple suffix chahiye
// hota hai (e.g. `ffmpeg-x86_64-pc-windows-msvc.exe`). Ye script wo copy khud
// bana deta hai taake user ko manually rename na karna pare.

import { execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binariesDir = join(__dirname, "..", "src-tauri", "binaries");

function getTargetTriple() {
  try {
    return execSync("rustc --print host-tuple").toString().trim();
  } catch {
    // Older rustc fallback
    const out = execSync("rustc -Vv").toString();
    const match = /host:\s*(\S+)/.exec(out);
    if (!match) throw new Error("Target triple nahi mil saka (rustc -Vv se).");
    return match[1];
  }
}

function prepare(baseName) {
  const ext = process.platform === "win32" ? ".exe" : "";
  const plain = join(binariesDir, `${baseName}${ext}`);
  if (!existsSync(plain)) {
    console.warn(
      `[prepare-ffmpeg] ${plain} nahi mili — is naam se rakho: src-tauri/binaries/${baseName}${ext}`,
    );
    return;
  }
  const triple = getTargetTriple();
  const target = join(binariesDir, `${baseName}-${triple}${ext}`);
  copyFileSync(plain, target);
  console.log(`[prepare-ffmpeg] ${baseName}${ext} -> ${baseName}-${triple}${ext}`);
}

prepare("ffmpeg");
prepare("ffprobe");
