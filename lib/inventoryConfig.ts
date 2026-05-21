export type InventoryCategoryDef = { slug: string; label: string };

export const DEFAULT_INVENTORY_CATEGORIES: InventoryCategoryDef[] = [
  { slug: "electronics", label: "Electronics" },
  { slug: "furniture", label: "Furniture" },
  { slug: "tools", label: "Tools" },
  { slug: "marketing", label: "Marketing / Brochures" },
  { slug: "stationery", label: "Stationery" },
  { slug: "visa_supplies", label: "Visa supplies" },
  { slug: "others", label: "Others" },
];

export const DEFAULT_INVENTORY_UNITS = ["pcs", "box", "pack", "ream", "set", "unit"] as const;

const LEGACY_CATEGORIES = new Set(["electronics", "furniture", "tools", "others"]);

export function normalizeInventoryCategories(raw: unknown): InventoryCategoryDef[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_INVENTORY_CATEGORIES.map((c) => ({ ...c }));
  }
  const out: InventoryCategoryDef[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const slug = String((row as { slug?: unknown }).slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 64);
    const label = String((row as { label?: unknown }).label ?? slug).trim().slice(0, 128);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, label: label || slug });
  }
  return out.length > 0 ? out : DEFAULT_INVENTORY_CATEGORIES.map((c) => ({ ...c }));
}

export function normalizeInventoryUnits(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_INVENTORY_UNITS];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of raw) {
    const unit = String(u).trim().slice(0, 32);
    if (!unit || seen.has(unit)) continue;
    seen.add(unit);
    out.push(unit);
  }
  return out.length > 0 ? out : [...DEFAULT_INVENTORY_UNITS];
}

export function isInventoryCategoryAllowed(slug: string, categories: InventoryCategoryDef[]): boolean {
  const s = String(slug).trim();
  if (LEGACY_CATEGORIES.has(s)) return true;
  return categories.some((c) => c.slug === s);
}

export function inventoryCategoryLabel(slug: string, categories: InventoryCategoryDef[]): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug.replace(/_/g, " ");
}
