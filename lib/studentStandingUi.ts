import type { CSSProperties } from "react";

const STANDING_STYLES: Record<string, CSSProperties> = {
  hot: { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
  warm: { backgroundColor: "#fed7aa", color: "#92400e", borderColor: "#fdba74" },
  heated: { backgroundColor: "#fef3c7", color: "#b45309", borderColor: "#fcd34d" },
  cold: { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" },
  missed: { backgroundColor: "#f3f4f6", color: "#374151", borderColor: "#e5e7eb" },
};

const DEFAULT_STANDING_STYLE: CSSProperties = {
  backgroundColor: "#f3f4f6",
  color: "#374151",
  borderColor: "#e5e7eb",
};

export function standingInlineStyle(standing: string | undefined | null): CSSProperties {
  if (!standing) return DEFAULT_STANDING_STYLE;
  return STANDING_STYLES[standing] ?? DEFAULT_STANDING_STYLE;
}

export function formatStandingLabel(standing: string | undefined | null): string {
  if (!standing) return "";
  return standing.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function standingOptionPrefix(value: string): string {
  switch (value) {
    case "hot":
      return "🔴 ";
    case "warm":
      return "🟠 ";
    case "heated":
      return "🟡 ";
    case "cold":
      return "🔵 ";
    case "missed":
      return "⚪ ";
    default:
      return "";
  }
}
