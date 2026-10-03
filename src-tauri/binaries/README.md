# ffmpeg / ffprobe binaries

**Ab manually kuch karne ki zaroorat nahi hai.** `npm run app:dev` ya
`npm run app:build` chalate waqt (ya CI mein) ye khud ho jata hai:

1. `scripts/fetch-ffmpeg.mjs` — agar ye files yahan nahi hain, to
   [descriptinc/ffmpeg-ffprobe-static](https://github.com/descriptinc/ffmpeg-ffprobe-static)
   (verified, maintained, GPL static builds — 19.5k weekly npm downloads) se
   current platform ke liye khud download kar leta hai.
2. `scripts/prepare-ffmpeg.mjs` — unhe Tauri sidecar ke required naam
   (`ffmpeg-<target-triple>.exe`) pe copy kar deta hai.

**Ye files GIT mein commit NAHI karni** — ye har ek ~130MB hain, aur
GitHub har file ko max 100MB tak allow karta hai (isse zyada pe push reject
ho jata hai). `.gitignore` mein already exclude hain.

Agar khud test karna ho ke fetch step theek chal raha hai:

```
node scripts/fetch-ffmpeg.mjs
```

Apna khud ka ffmpeg build use karna ho (jaise koi specific codec config),
to bas `ffmpeg(.exe)`/`ffprobe(.exe)` isi folder mein plain naam se rakh do
— script dekhega ke file already hai to dobara download nahi karega.
