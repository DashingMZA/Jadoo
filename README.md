# Jadoo

Batch video logo-overlay desktop app — Tauri 2 + Next.js. `ffmpeg`/`ffprobe`
bundled sidecar ke through chalta hai, koi external install/PATH setup nahi
chahiye end-user ko.

**GitHub pe publish karna, releases banana, auto-update, aur apni website pe
download button lagana — sab `RELEASES.md` mein hai.**

Project ka package manager **pnpm** hai (`packageManager` field,
`pnpm-lock.yaml`, CI sab pnpm use karte hain) — maine apne test-sandbox mein
sirf verification ke liye `npm install`/`npx` use kiya tha (wahan pnpm
nahi tha), lekin aapko hamesha `pnpm` hi use karna hai, jaisa neeche steps
mein hai. Rust/Tauri wala hissa (`src-tauri/`) is sandbox mein compile nahi ho
saka kyunke yahan Rust toolchain available nahi — wo aapko apne Windows
machine pe pehli baar `pnpm tauri dev` chalate waqt build hoga. Maine har
Rust API (tray, close-to-tray, autostart, sidecar) current Tauri v2 docs se
verify ki hai, lekin real compile aapke system pe hi hoga — agar koi chhoti
compile error aaye (dependency version drift waghera), mujhe error paste kar
dena, foran fix kar dunga.

## 1. Pehli baar setup

```powershell
# Node 24+, Rust (rustup), pnpm chahiye honge — https://tauri.app/start/prerequisites/
pnpm install
```

## 2. ffmpeg/ffprobe daalo

`src-tauri/binaries/ffmpeg.exe` aur `src-tauri/binaries/ffprobe.exe` — bas
inhe isi plain naam se yahan copy kar do (dekho
`src-tauri/binaries/README.md`). Baaki khud ho jayega.

## 3. App icon banao (optional, par recommended)

```powershell
pnpm app:icon path\to\StoreLogo.png
```

## 4. Dev mein chalao

```powershell
pnpm app:dev
```

Pehli baar Rust dependencies download/compile hongi (thora time lagega).
Window khulni chahiye "Jadoo" title ke sath.

## 5. Production build

```powershell
pnpm app:build
```

`src-tauri/target/release/bundle/` mein `.exe`/`.msi` installer milega.

## 6. Auto-update signing keys (aap khud karenge, jaisa aapne kaha)

```powershell
pnpm tauri signer generate -w ~/.tauri/jadoo.key
```

Jo public key milegi wo `src-tauri/tauri.conf.json` ke
`plugins.updater.pubkey` mein daal do, `plugins.updater.active` ko `true` kar
do, aur `endpoints` ko apne real update-server URL se badal do. Tab tak About
page ka "Check for Updates" button gracefully "not configured" message dega.

## App ka structure — kya kahan hai

| Cheez | File |
|---|---|
| Home page (batch trigger) | `src/app/page.tsx` |
| Layout Profiles page | `src/app/layout-profiles/page.tsx` |
| Settings page (language, accent color, startup) | `src/app/settings/page.tsx` |
| History page | `src/app/history/page.tsx` |
| Donate page (Crypto/Other tabs) | `src/app/donate/page.tsx` (aapke `donation.ts` se) |
| About page | `src/app/about/page.tsx` |
| Sidebar (logo, nav, theme toggle, status, collapse) | `src/components/Sidebar.tsx` |
| Global preferences/batch-status context | `src/context/AppContext.tsx` |
| i18n dictionary (en/ur/hi/ar/de) | `src/lib/i18n.ts` |
| Accent color presets | `src/lib/accent-colors.ts` |
| Logo drag-position picker | `src/components/LogoPositionPicker.tsx` |
| Batch trigger + live progress | `src/components/BatchRunner.tsx` |
| Overlay/ffmpeg logic + sample-video resolution (Rust) | `src-tauri/src/commands/ffmpeg.rs` |
| Profiles/settings/preferences/history — Tauri commands (Rust) | `src-tauri/src/commands/profiles.rs` |
| SQLite database — schema, queries, JSON-file migration (Rust) | `src-tauri/src/commands/db.rs` |
| Tray / close-to-tray / autostart / single-instance | `src-tauri/src/lib.rs` |
| Main config (name/version/identifier/port) | `src-tauri/tauri.conf.json` |
| Sample/default preview videos config | `src-tauri/sample-videos.json`, `src-tauri/sample-videos/` |

## Sample/default preview videos (Home page aur Layout Profiles pe auto-preview)

Home page (aur Layout Profiles page ka auto-preview) ab **sirf default sample
videos** dikhata hai — koi manual file-pick nahi (Layout Profiles page pe ek
"apni sample video se preview dikhao" button abhi bhi hai, jaisa aapne
maanga). In default videos ko set karne ke 2 tareeke hain:

1. **Bundle karo** — `src-tauri/sample-videos/<slug>.mp4` (exact naam ke liye
   `src-tauri/sample-videos/README.md` dekho).
2. **Google Drive / koi bhi URL (recommended)** — `src-tauri/sample-videos.json`
   mein us resolution label ke against direct-download URL daal do. App
   pehli baar use hone pe khud download karke cache kar legi.

App pehle bundled file check karti hai, phir cache, phir URL se download.
Koi sample configure na ho to preview khali (placeholder) dikhega — batch
processing par isse koi asar nahi padta.

## Naye features (latest update)

- **Storage ab JSON files nahi, SQLite database hai**
  (`app_config_dir()/jadoo.db`) — profiles, settings, preferences, history
  sab isi mein. Plain text file ki tarah kisi editor se khol ke manually
  change nahi ki ja sakti (SQLite ek binary database format hai). Pehli baar
  naye version pe chalne par, agar purani `*.json` files mili to unka data
  khud-ba-khud DB mein copy ho jata hai (purani files delete nahi hoti,
  `.migrated` suffix lag ke safe rehti hain).
- **Tray menu translated** — "Open Jadoo"/"Quit" ab app ki language mein
  (5 languages), aur language badalte hi turant update ho jata hai.
- **Sidebar mein version number** (jaisa screenshot mein tha).
- **Update-available aur batch start/end ke liye toast notifications.**
- **About page 3 tabs mein**: App / Social / Contact (aapke `social.ts`/
  `contact.ts` se).


- **Window size fix:** `tauri.conf.json` mein aapke diye gaye window
  changes merge kar diye (height 910, minWidth 1000, minHeight 910,
  resizable false, maximizable false). Ek bug bhi pakda: `devUrl` galti se
  `1421` set tha jabke `package.json` ka dev server `1420` pe chalta hai —
  wapas `1420` kar diya (warna `pnpm app:dev` connect nahi hota).
- CSS mein ek responsive breakpoint add kiya (`@media max-width:1160px`) —
  taake agar window kabhi 1000px minWidth tak resize ho (abhi
  `resizable:false` hai, lekin agar future mein wapas resizable karo), to
  Home/Layout-Profiles ke do-column layouts overflow/clip na hon, balke ek
  column mein stack ho jayein.
- **Cross-platform build:** `bundle.targets` ko `"all"` kar diya (pehle sirf
  Windows/macOS targets list the — Linux (deb/rpm/appimage) missing tha).
  Publisher/copyright/description bhi add kiye — ye Windows exe properties,
  installer, aur macOS/Linux package metadata mein sahi info dikhayenge.
- **`build.rs` update:**
  - Build-time version compute hoti hai (CI/release build mein git tag se
    `v1.0.0`, local dev build mein `dev-<git-hash>`, git na ho to
    `Development`) — About page pe "Build" field mein dikhti hai.
  - Windows ke liye `windows-app-manifest.xml` (aapki file) ko official
    `tauri_build` API (`WindowsAttributes::app_manifest`) se embed kiya —
    isse native dialogs/tray sahi (modern) theme ke sath render hote hain.
    **Note:** tauri_build ka default manifest already yehi Common-Controls-v6
    dependency include karta hai, to practically ye already kaam kar raha
    tha — lekin ab file aapke control mein hai agar aage DPI-awareness ya
    `requestedExecutionLevel` jaisi cheez add karni ho.
  - Maine aapke bheje hue teesre build.rs (jo `/MANIFEST:EMBED` linker flag
    se manually manifest embed karta tha) ko jaan-boojh kar copy NAHI kiya —
    wo approach tauri_build ke apne resource-generation se duplicate-manifest
    conflict kar sakta tha (verify nahi kar saka is sandbox mein). Official
    `.app_manifest()` API zyada safe hai aur wahi cheez achieve karta hai.



- **Full i18n** — ab poori app (saare pages, buttons, hints, alerts, quality/
  audio labels, accent color names) translate hoti hai: English, اردو,
  हिन्दी, العربية, Deutsch. Strings `src/locales/*.json` mein hain.
- **Naya language add karna (3 steps):** (1) `src/locales/en.json` copy karke
  `src/locales/<code>.json` banao aur translate karo (keys mat badlo);
  (2) `src/locales/index.ts` mein `import xx from "./xx.json"`; (3) `LOCALES`
  array mein ek entry. Dropdown, types aur RTL direction auto derive hote hain.
- **Bohot saare naye resolutions, groups ke sath** (Settings -> Layout
  Profiles -> Screen Size dropdown mein `<optgroup>`): Instagram (Reels,
  Stories, Feed), Facebook (Reels, Stories, Feed), X, YouTube (8K…240p),
  YouTube Shorts (8K…240p), LinkedIn, Pinterest, Snapchat — sproutsocial.com
  ke video-specs guide ke mutabiq. List `src/lib/resolutions.ts` mein hai.
- **Sample video fallback by aspect ratio** — `sample-videos.json` ab
  `byResolutionLabel` + `byAspect` dono support karta hai, isliye naye
  resolutions ke liye alag video ki zaroorat nahi.
- **Real app icons** (`src-tauri/icons/`) aur sidebar mein asal Jadoo logo.

## Naye features (pichli update)

- **Bug fix (glitchy preview):** preview ab ffmpeg se frame-extract nahi
  karta (jo kuch videos pe corrupted/glitchy image deta tha) — ab seedha
  asal sample video file ko native `<video>` tag mein play karta hai. Bonus:
  ab preview **chalti hai** (static frame nahi), aur logo bilkul waisa hi
  dikhta hai jaisा final output mein hoga.
- i18n ab `src/locales/{en,ur,hi,ar,de}.json` — har language ki apni file,
  jaisa aapne screenshot mein dikhaya. Naya translatable string add karna ho
  to **paanchon** files mein wahi key add karo, phir `src/locales/index.ts`
  ke `TranslationKey` type (jo `en.json` ki keys se auto-derive hota hai) use
  ho jayega.
- Sidebar collapsed ho to theme toggle bhi sirf **1 icon** dikhata hai
  (current mode ka) — click se agla mode cycle ho jata hai. Expand karte hi
  wapas 3 alag icons (dark/light/system) dikhte hain.
- Native right-click context menu (Back/Refresh/Save as/Print) poori tarah
  band kar di gayi hai — iski jagah ek **custom context menu** hai jo app ke
  saare pages ke quick-navigation links dikhata hai.
- **Startup ab by-default ON hai** — pehli baar app khulte hi khud autostart
  enable ho jata hai. User baad mein Settings se disable kare to wo respect
  hota hai (dobara force-on nahi hota agli baar).
- Sidebar ke active nav item ka background ab **solid accent color** hai,
  icon/text uske upar readable contrasting color (white ya dark, accent ke
  hisaab se) mein.
- Sample-videos folder + `sample-videos.json` dono **installer ke sath
  bundle** hain (Program Files jaisi protected location) — normal user inhe
  edit nahi kar sakta. Apni video try karni ho to Layout Profiles page ka
  "Apni sample video se preview dikhao…" button hai.

## Naye features (usse pehle ki update)

- Logo ka size set karne par height hamesha sahi aspect-ratio ke sath scale
  hoti hai (`scale2ref` filter ka ek gotcha fix kiya gaya — verified).
- Logo size **1% se 100%** tak.
- Layout Profile apna **logo image path bhi save** karta hai — Home page
  profile select karte hi logo + transparency auto-fill kar deta hai.
- **Settings page** — language, 9 accent color presets, startup toggle.
- **History page** — har batch run ka record.
- **Donate page** (pehle "Donation") — Crypto/Other tabs.

## Known limitations (honest list)

- i18n abhi sirf sidebar/status jaisi "chrome" strings translate karta hai —
  har page ka poora content abhi Roman Urdu/English mix mein hai.
- Batch progress per-video hai (start/done/failed) — frame-by-frame %
  progress bar nahi hai.
- App icons khud generate karni hongi (`pnpm app:icon`).
- Updater signing keys aap khud generate karoge.
- Asset-protocol scope `["**"]` rakha hai (local logo image + sample video
  preview ke liye).
- Rust side (`src-tauri/`) is baar bhi is sandbox mein compile nahi ho saka
  (yahan Rust toolchain available nahi). Koi build error aaye to paste kar
  dena.

