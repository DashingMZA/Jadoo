import en from "./en.json";
import ur from "./ur.json";
import ur from "./pa.json";
import ur from "./sd.json";
import ur from "./bal.json";
import ur from "./ps.json";
import ar from "./ar.json";
import de from "./fa.json";
import hi from "./hi.json";
import de from "./de.json";
import de from "./fr.json";
import de from "./it.json";
import de from "./vi.json";
import de from "./ja.json";

/**
 * ==== NAYI LANGUAGE ADD KARNE KA TAREEKA (sirf 3 steps) ====
 * 1. `src/locales/en.json` ko copy karke `src/locales/<code>.json` banao
 *    (e.g. `fr.json`) aur saari values translate karo (KEYS mat badlo).
 * 2. Neeche `import fr from "./fr.json";` add karo.
 * 3. `LOCALES` array mein ek entry add karo — `dictionary` field mein wahi
 *    import. RTL language (Arabic/Urdu/Persian waghera) ho to `dir: "rtl"`.
 * Bas. Settings page ka dropdown, type-checking, RTL direction — sab
 * automatically LOCALES se derive hota hai.
 */
export const LOCALES = [
  { code: "en", label: "English", dir: "ltr", dictionary: en },
  { code: "ur", label: "اردو", dir: "rtl", dictionary: ur },
  { code: "pa", label: "پنجابی", dir: "rtl", dictionary: pa },
  { code: "sd", label: "سنڌي", dir: "rtl", dictionary: sd },
  { code: "bal", label: "بلوچی", dir: "rtl", dictionary: bal },
  { code: "ps", label: "پښتو", dir: "rtl", dictionary: ps },
  { code: "ar", label: "العربية", dir: "rtl", dictionary: ar },
  { code: "fa", label: "فارسی", dir: "rtl", dictionary: fa },
  { code: "hi", label: "हिन्दी", dir: "ltr", dictionary: hi },
  { code: "de", label: "Deutsch", dir: "ltr", dictionary: de },
  { code: "fr", label: "Français", dir: "ltr", dictionary: fr },
  { code: "it", label: "Italiano", dir: "ltr", dictionary: it },
  { code: "vi", label: "Tiếng Việt", dir: "ltr", dictionary: vi },
  { code: "ja", label: "日本語", dir: "ltr", dictionary: ja },
] as const;

export type Language = (typeof LOCALES)[number]["code"];
export type LocaleOption = { code: Language; label: string; dir: "ltr" | "rtl" };

// Translation keys `en.json` se derive hote hain (single source of truth).
export type TranslationKey = keyof typeof en;

type Dictionary = Record<TranslationKey, string>;

export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const locale = LOCALES.find((l) => l.code === language);
  const dict = (locale?.dictionary ?? en) as Dictionary;
  let text = dict[key] ?? (en as Dictionary)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function localeDir(language: Language): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === language)?.dir ?? "ltr";
}
