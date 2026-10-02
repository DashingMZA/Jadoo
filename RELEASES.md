# GitHub pe publish karna, releases, aur auto-update

Short version: **code GitHub pe rehta hai, builds bhi GitHub Actions khud
banata hai, aur files GitHub Releases se serve hoti hain** — aapki apni
website (jadoo.bond) sirf ek download button dikhati hai jo GitHub ke actual
file URL par point karta hai. Koi alag server/hosting/bandwidth cost nahi.

## ⚠️ Pehle apna abhi wala push fix karo

Aapne jo kiya usme 2 cheezein atki hain:

**1. Signer key:** `jadoo.key` pehle se maujood hai (shayad ek adhoori
pichli koshish se), isliye `generate` mana kar raha hai. `--force` lagao:

```powershell
pnpm tauri signer generate -w C:/Users/XeeBee/.tauri/jadoo.key --force
```

(Agar us purani key ko kahin use nahi kiya, to overwrite karna bilkul safe
hai.) Is baar jo public key print ho, wo copy kar lena — niche step 3 mein
chahiye hogi.

**2. Push reject hui:** `ffmpeg.exe`/`ffprobe.exe` (136MB each) GitHub ki
100MB/file limit se badi hain — isliye reject hui. Maine project update kar
diya hai taake ye files ab **kabhi commit hi na ho** (neeche section 2
dekho — CI/local dono khud download kar lete hain). Lekin aapka pehla
commit already apni local git history mein unhe commit kar chuka hai,
isliye pehle use nikalna hoga. Chunki ye bilkul pehla commit hai aur
remote pe kuch gaya hi nahi (push poora fail hua), sabse simple fix history
hi restart karna hai:

```bash
cd /d/github/zaheer/Jadoo/jadoo
rm -rf .git
```

Phir naya project zip extract karo (isme updated `.gitignore` already hai
jo in files ko kabhi commit hi nahi hone dega), aur dobara se:

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DashingMZA/Jadoo.git
git branch -M main
git push -u origin main
```

Is baar `ffmpeg.exe`/`ffprobe.exe` add hi nahi honge (gitignore unhe skip
kar dega), to push bina kisi masle ke ho jayegi.

## 1. GitHub pe daalna (ek baar)

```powershell
cd D:\github\zaheer\Jadoo\jadoo
git init
git add .
git commit -m "Initial commit"
```

GitHub.com pe jaake naya **private ya public** repo banao (bina README/gitignore
ke — wo already hain), phir:

```powershell
git remote add origin https://github.com/<aapka-username>/<repo-naam>.git
git branch -M main
git push -u origin main
```

## 2. ffmpeg/ffprobe — ab automatic hai, kuch karne ki zaroorat nahi

CI (aur local `pnpm app:dev`/`pnpm app:build`) khud ffmpeg/ffprobe download
kar leta hai — `scripts/fetch-ffmpeg.mjs`, ek verified maintained source
(`descriptinc/ffmpeg-ffprobe-static`, GPL static builds, 19.5k weekly npm
downloads) se, current platform ke liye. Maine ye khud test kiya hai —
real binary download karke chalaya, kaam karta hai.

**In files ko GIT mein commit MAT karo** — ~130MB each hain, aur GitHub
har file ko max 100MB tak allow karta hai (isse upar push reject ho jata
hai, jaisa aapke saath hua). `.gitignore` mein already exclude hain.

## 3. Auto-update signing keys (ek baar)

```powershell
pnpm tauri signer generate -w ~/.tauri/jadoo.key
```

Ye 2 cheezein degi:
- Ek **private key** (file: `~/.tauri/jadoo.key`) — GitHub Secret mein jayegi
- Ek **public key** — `tauri.conf.json` mein jayegi

### Public key `tauri.conf.json` mein daalo
`src-tauri/tauri.conf.json` -> `plugins.updater.pubkey` mein
`REPLACE_WITH_YOUR_UPDATER_PUBLIC_KEY` ki jagah wo public key paste karo.

### Private key GitHub Secrets mein daalo
Repo -> **Settings -> Secrets and variables -> Actions -> New repository secret**:
- `TAURI_SIGNING_PRIVATE_KEY` — private key file (`jadoo.key`) ka poora content
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — jo password generate karte waqt set kiya tha (khali ho to empty rehne do)

## 4. Updater endpoint set karo

`tauri.conf.json` -> `plugins.updater.endpoints` mein already ye hai:

```
https://github.com/REPLACE_WITH_YOUR_GITHUB_USERNAME/REPLACE_WITH_YOUR_REPO_NAME/releases/latest/download/latest.json
```

Apna username/repo daal do. Ye URL GitHub khud serve karta hai (`latest.json`
CI build ke waqt khud ban jati hai aur release ke sath attach ho jati hai) —
koi backend banane ki zaroorat nahi.

## 5. Release banana

```powershell
git tag v1.0.1
git push origin v1.0.1
```

Bas itna — GitHub Actions (`.github/workflows/release.yml`) khud:
1. Windows/macOS (Intel + Apple Silicon)/Linux, teeno pe app build karega
2. Sab installers (.msi, .exe, .dmg, .AppImage, .deb, .rpm) banayega
3. Ek **DRAFT** GitHub Release banayega, sab files attach karega, `latest.json` bhi

**Zaroori: Release "Draft" hi rehti hai jab tak aap khud "Publish" na karo**
(GitHub repo -> Releases -> us draft ko kholo -> "Publish release"). Jab tak
publish nahi karoge, na downloads ka link kaam karega, na auto-update
(kyunke `/releases/latest` sirf published releases dekhta hai). Ye
jaan-boojh kar rakha hai taake koi buggy build accidentally live na ho jaye —
publish se pehle release notes edit kar sakte ho, ya files download karke
khud test kar sakte ho.

Agli baar jab bhi naya version release karna ho: `tauri.conf.json` ka
`version` field badlo, commit karo, naya tag push karo.

## 6. Apni website (jadoo.bond) pe download button

`website/download-widget.html` mein ek ready-made widget hai jo GitHub
Releases API se khud latest version ka download link uthata hai aur visitor
ke OS (Windows/macOS/Linux) ke hisaab se sahi button dikhata hai. Isme sirf
apna GitHub username/repo daalna hai (file ke top pe `GITHUB_OWNER` /
`GITHUB_REPO`), phir:

- Poori file ko apni website ke kisi page mein paste kar do, YA
- `<iframe src="download-widget.html" style="border:0;width:100%;height:220px"></iframe>`
  se embed kar do (file ko apni website pe kahin bhi host karke)

Files khud GitHub se download hoti hain — aapki website pe koi extra
hosting/bandwidth load nahi padta, bas link dikhana hai.

## Local build ke liye — kya alag hai

`pnpm app:build` (local) aur CI release mein sirf ye farq hai: local build
mein agar `TAURI_SIGNING_PRIVATE_KEY` env var set nahi hai, to signed
updater-bundle generate nahi hoga (baaki installer normal ban jayega) — ye
local testing ke liye bilkul theek hai, sirf GitHub Release (jahan secret
set hai) hi signed updates publish karegi.
