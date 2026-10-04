# Sample / default preview videos

Ye videos "Home" page aur "Layout Profiles" page ke preview mein automatically
CHALTI hain (static image nahi, asal playable video) — user ko manually koi
video pick nahi karni padti Home page pe, aur dekh kar confirm ho jata hai ke
logo sahi lag raha hai ya nahi.

Ye files aur `sample-videos.json` dono **installer ke sath bundle hoti hain**
(Program Files jaisi protected location mein) — normal user inhe change nahi
kar sakta. Agar user apni khud ki video pe try karna chahe, iske liye "Layout
Profiles" page pe alag se "Apni sample video se preview dikhao…" button hai.

## Option A — Local file bundle karo (yahan, isi folder mein)

Neeche di gayi list mein se, jitni resolutions ke liye video rakhni hai,
EXACT isi naam se `.mp4` file yahan copy kar do (naam `src/lib/resolutions.ts`
ke labels se banta hai — lowercase, non-alphanumeric characters `-` se
replace, duplicate dashes hata ke):

| Resolution (label jo app mein dikhta hai) | File ka EXACT naam |
|---|---|
| 9:16 Vertical (1080x1920) — Reels/Shorts/TikTok | `9-16-vertical-1080x1920-reels-shorts-tiktok.mp4` |
| 16:9 Horizontal (1920x1080) — YouTube | `16-9-horizontal-1920x1080-youtube.mp4` |
| 1:1 Square (1080x1080) — Feed post | `1-1-square-1080x1080-feed-post.mp4` |
| 4:5 Portrait (1080x1350) — Instagram feed | `4-5-portrait-1080x1350-instagram-feed.mp4` |
| 9:16 Vertical (720x1280) | `9-16-vertical-720x1280.mp4` |
| 16:9 Horizontal (1280x720) | `16-9-horizontal-1280x720.mp4` |

So poora path, e.g.:

```
src-tauri/sample-videos/9-16-vertical-1080x1920-reels-shorts-tiktok.mp4
```

Ye files installer ke sath bundle ho jayengi (`tauri.conf.json` ->
`bundle.resources`). Har video chota rakho (kuch second, few MB) — sirf
preview ke liye hai.

**Compatibility tip:** H.264 (`libx264`) video codec + AAC audio, `.mp4`
container use karo — ye Windows (WebView2) aur macOS (WKWebView) dono ke
native `<video>` player mein bina kisi extra codec ke chalti hai. HEVC/H.265
kuch systems pe nahi chalti.

## Aspect-ratio fallback (naye resolutions ke liye alag video ki zaroorat nahi)

Har resolution ek aspect bucket (`16:9`, `9:16`, `1:1`, `4:5`, `2:3`) se
belong karta hai. App pehle **exact resolution label** ki video dhoondti hai,
na mile to us resolution ke **aspect bucket** wali video use karti hai. Isliye
YouTube 8K/4K/…, Shorts, Instagram, Facebook, X, LinkedIn, Pinterest,
Snapchat — sab naye resolutions ko sirf 4-5 videos se preview mil jata hai.

Local bundle ke liye aspect-bucket filenames:

| Aspect | File ka EXACT naam |
|---|---|
| 16:9 | `16-9.mp4` |
| 9:16 | `9-16.mp4` |
| 1:1 | `1-1.mp4` |
| 4:5 | `4-5.mp4` |
| 2:3 | `2-3.mp4` |

`sample-videos.json` ka structure: `byResolutionLabel` (exact label -> URL) aur
`byAspect` (aspect -> URL). Priority: label (bundled -> cache -> URL), phir
aspect (bundled -> cache -> URL).

## Option B — Google Drive (ya kisi bhi direct-download URL) — RECOMMENDED

`src-tauri/sample-videos.json` mein `byResolutionLabel` (exact label) ya
`byAspect` (aspect bucket) ke against apna direct-download URL daal do. App pehli baar
use hone pe khud download karke cache kar legi — installer chota rehta hai.

Google Drive se direct-download link banane ke liye file ka ID nikal ke ye
format use karo:

```
https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
```

App pehle local file (Option A) check karti hai, phir cache
(`app_cache_dir/sample-videos/`), phir ye URL.
