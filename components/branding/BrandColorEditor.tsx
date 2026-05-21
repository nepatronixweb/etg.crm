"use client";

import { BRAND_COLOR_PRESETS, buildBrandThemeTokens, normalizeHexColor } from "@/lib/brandTheme";

export type BrandColorEditorProps = {
  primary: string;
  secondary: string;
  shortCode: string;
  companyName: string;
  logoUrl?: string;
  onPrimaryChange: (hex: string) => void;
  onSecondaryChange: (hex: string) => void;
  onBothChange?: (primary: string, secondary: string) => void;
};

export function BrandThemePreview({
  primary,
  secondary,
  shortCode,
  companyName,
  logoUrl,
}: Pick<BrandColorEditorProps, "primary" | "secondary" | "shortCode" | "companyName" | "logoUrl">) {
  const tokens = buildBrandThemeTokens(primary, secondary);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
        Live preview — matches your sidebar & buttons
      </div>
      <div className="flex min-h-[120px]">
        <div
          className="w-48 shrink-0 p-3 flex flex-col gap-2 border-r"
          style={{ backgroundColor: tokens.sidebarBg, borderColor: tokens.sidebarBorder }}
        >
          <div
            className="flex items-center gap-2 pb-2 border-b"
            style={{ borderColor: tokens.sidebarBorder }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0"
              style={{ backgroundColor: tokens.secondary, color: tokens.onPrimary }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                (shortCode || "ORG").slice(0, 3)
              )}
            </div>
            <span className="text-xs font-semibold truncate text-white">
              {(companyName || "Your Company").split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
          <div
            className="text-[11px] px-2 py-1.5 rounded-md font-medium"
            style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}
          >
            Dashboard
          </div>
          <div className="text-[11px] px-2 py-1.5 rounded-md" style={{ color: tokens.sidebarMuted }}>
            Leads
          </div>
          <div
            className="text-[11px] px-2 py-1.5 rounded-md transition-colors"
            style={{ color: tokens.sidebarMuted }}
          >
            Students
          </div>
        </div>
        <div className="flex-1 p-4 bg-gray-50 flex flex-col justify-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
              style={{ backgroundColor: tokens.primary, color: tokens.onPrimary }}
            >
              Primary button
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-semibold border"
              style={{
                borderColor: tokens.primary,
                color: tokens.primary,
                backgroundColor: tokens.primarySoft,
              }}
            >
              Outline button
            </button>
          </div>
          <span className="text-sm font-medium" style={{ color: tokens.primary }}>
            Link & highlight text
          </span>
          <div
            className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full w-fit"
            style={{ backgroundColor: tokens.primarySoft, color: tokens.primary }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tokens.primary }} />
            Status badge
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandColorEditor({
  primary,
  secondary,
  shortCode,
  companyName,
  logoUrl,
  onPrimaryChange,
  onSecondaryChange,
  onBothChange,
}: BrandColorEditorProps) {
  const primaryNorm = normalizeHexColor(primary);
  const secondaryNorm = normalizeHexColor(secondary || primary);

  const applyPreset = (p: string, s: string) => {
    if (onBothChange) onBothChange(p, s);
    else {
      onPrimaryChange(p);
      onSecondaryChange(s);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLOR_PRESETS.map((preset) => {
            const selected =
              primaryNorm === preset.primary.toLowerCase() &&
              secondaryNorm === preset.secondary.toLowerCase();
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.primary, preset.secondary)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span
                  className="flex h-5 w-5 rounded-full ring-1 ring-black/10"
                  style={{ background: preset.primary }}
                />
                <span
                  className="flex h-5 w-5 rounded-full ring-1 ring-black/10"
                  style={{ background: preset.secondary }}
                />
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Primary color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryNorm}
              onChange={(e) => onPrimaryChange(normalizeHexColor(e.target.value))}
              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={primaryNorm.toUpperCase()}
              onChange={(e) => onPrimaryChange(normalizeHexColor(e.target.value, primaryNorm))}
              className="flex-1 min-w-0 px-2 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
              maxLength={7}
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Buttons, links, and active menu items</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accent / sidebar color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={secondaryNorm}
              onChange={(e) => onSecondaryChange(normalizeHexColor(e.target.value))}
              className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={secondaryNorm.toUpperCase()}
              onChange={(e) => onSecondaryChange(normalizeHexColor(e.target.value, secondaryNorm))}
              className="flex-1 min-w-0 px-2 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase"
              maxLength={7}
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Sidebar tint, logo badge, and darker accents</p>
        </div>
      </div>

      <BrandThemePreview
        primary={primaryNorm}
        secondary={secondaryNorm}
        shortCode={shortCode}
        companyName={companyName}
        logoUrl={logoUrl}
      />
    </div>
  );
}
