/** Normalize #RGB / #RRGGBB for CSS. */
export function normalizeHexColor(raw: string, fallback = "#2563eb"): string {
  const s = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHexColor(hex);
  const n = parseInt(h.slice(1), 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Blend two hex colors. `weight` 0 = a, 1 = b. */
export function mixHex(hexA: string, hexB: string, weight: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return normalizeHexColor(hexA);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r + (b.r - a.r) * w,
    a.g + (b.g - a.g) * w,
    a.b + (b.b - a.b) * w
  );
}

/** Lighten (+) or darken (-) a hex color by percent 0–100. */
export function adjustHexColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = percent / 100;
  if (factor >= 0) {
    return rgbToHex(
      rgb.r + (255 - rgb.r) * factor,
      rgb.g + (255 - rgb.g) * factor,
      rgb.b + (255 - rgb.b) * factor
    );
  }
  const f = 1 + factor;
  return rgbToHex(rgb.r * f, rgb.g * f, rgb.b * f);
}

/** Relative luminance — pick white or dark text on a background. */
export function contrastTextOn(hex: string): "#ffffff" | "#111827" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.55 ? "#111827" : "#ffffff";
}

export const BRAND_COLOR_PRESETS = [
  { name: "Royal Blue", primary: "#2563eb", secondary: "#1d4ed8" },
  { name: "Indigo", primary: "#4f46e5", secondary: "#4338ca" },
  { name: "Teal", primary: "#0d9488", secondary: "#0f766e" },
  { name: "Emerald", primary: "#059669", secondary: "#047857" },
  { name: "Rose", primary: "#e11d48", secondary: "#be123c" },
  { name: "Amber", primary: "#d97706", secondary: "#b45309" },
  { name: "Slate", primary: "#475569", secondary: "#334155" },
  { name: "Violet", primary: "#7c3aed", secondary: "#6d28d9" },
] as const;

export type BrandThemeTokens = {
  primary: string;
  secondary: string;
  primaryLight: string;
  primarySoft: string;
  onPrimary: "#ffffff" | "#111827";
  sidebarBg: string;
  sidebarHover: string;
  sidebarBorder: string;
  sidebarMuted: string;
};

export function buildBrandThemeTokens(primaryRaw: string, secondaryRaw?: string): BrandThemeTokens {
  const primary = normalizeHexColor(primaryRaw);
  const secondary = normalizeHexColor(secondaryRaw || primary);
  const sidebarBase = mixHex(secondary, "#0f172a", 0.72);

  return {
    primary,
    secondary,
    primaryLight: adjustHexColor(primary, 35),
    primarySoft: `${primary}18`,
    onPrimary: contrastTextOn(primary),
    sidebarBg: sidebarBase,
    sidebarHover: mixHex(secondary, "#1e293b", 0.55),
    sidebarBorder: mixHex(secondary, "#334155", 0.4),
    sidebarMuted: adjustHexColor(mixHex(secondary, "#94a3b8", 0.35), 15),
  };
}

export function applyBrandThemeToDocument(primary: string, secondary?: string): BrandThemeTokens {
  const tokens = buildBrandThemeTokens(primary, secondary);
  if (typeof document === "undefined") return tokens;

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", tokens.primary);
  root.style.setProperty("--brand-secondary", tokens.secondary);
  root.style.setProperty("--brand-primary-light", tokens.primaryLight);
  root.style.setProperty("--brand-primary-soft", tokens.primarySoft);
  root.style.setProperty("--brand-on-primary", tokens.onPrimary);
  root.style.setProperty("--brand-sidebar-bg", tokens.sidebarBg);
  root.style.setProperty("--brand-sidebar-hover", tokens.sidebarHover);
  root.style.setProperty("--brand-sidebar-border", tokens.sidebarBorder);
  root.style.setProperty("--brand-sidebar-muted", tokens.sidebarMuted);

  return tokens;
}
