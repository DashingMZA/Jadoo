export interface AccentColorOption {
  name: string;
  /** translation key, e.g. "accent.violet" */
  key: string;
  value: string;
  /** Is accent color ke upar likha text/icon kaunse color mein readable rahega. */
  contrast: "#ffffff" | "#111318";
}

// 9 preset accent colors — user profile screenshot (5 dots) se inspired,
// thora expand kiya gaya. Halke (lime/amber) colors pe dark contrast text
// zyada readable hota hai, baaki sab pe white.
export const ACCENT_COLORS: AccentColorOption[] = [
  { name: "Violet", key: "accent.violet", value: "#7c5cff", contrast: "#ffffff" },
  { name: "Lime", key: "accent.lime", value: "#9ee62b", contrast: "#111318" },
  { name: "Purple", key: "accent.purple", value: "#8b5cf6", contrast: "#ffffff" },
  { name: "Cyan", key: "accent.cyan", value: "#38bdf8", contrast: "#111318" },
  { name: "Pink", key: "accent.pink", value: "#f4568c", contrast: "#ffffff" },
  { name: "Amber", key: "accent.amber", value: "#f5a623", contrast: "#111318" },
  { name: "Emerald", key: "accent.emerald", value: "#22c55e", contrast: "#111318" },
  { name: "Rose", key: "accent.rose", value: "#fb7185", contrast: "#ffffff" },
  { name: "Sky", key: "accent.sky", value: "#3b82f6", contrast: "#ffffff" },
];
