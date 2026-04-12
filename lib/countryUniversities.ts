/** Normalized university row under a destination country (Settings → Countries). */

export type UniversityAttachment = {
  path: string;
  originalName: string;
};

export type UniversityEntry = {
  name: string;
  requirements: string;
  attachments: UniversityAttachment[];
  /** Course search / programme finder (opens in new tab from university cards). */
  findCourseUrl: string;
  /** Official English / language requirements page. */
  englishRequirementsUrl: string;
};

/** Safe href for opening user-entered URLs in a new tab (blocks javascript: / data:). */
export function safeExternalUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function normalizeUniversityEntry(u: unknown): UniversityEntry {
  if (typeof u === "string") {
    const name = u.trim();
    return { name, requirements: "", attachments: [], findCourseUrl: "", englishRequirementsUrl: "" };
  }
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    const attachments: UniversityAttachment[] = [];
    if (Array.isArray(o.attachments)) {
      for (const a of o.attachments) {
        if (a && typeof a === "object") {
          const rec = a as { path?: string; originalName?: string };
          const path = String(rec.path ?? "").trim();
          if (path) {
            attachments.push({
              path,
              originalName: String(rec.originalName ?? "").trim() || "Document",
            });
          }
        }
      }
    }
    return {
      name: String(o.name ?? "").trim(),
      requirements: String(o.requirements ?? ""),
      attachments,
      findCourseUrl: String(o.findCourseUrl ?? "").trim(),
      englishRequirementsUrl: String(o.englishRequirementsUrl ?? "").trim(),
    };
  }
  return { name: "", requirements: "", attachments: [], findCourseUrl: "", englishRequirementsUrl: "" };
}

export function normalizeUniversitiesArray(arr: unknown): UniversityEntry[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeUniversityEntry).filter((e) => e.name.length > 0);
}

export function universityEntryNames(entries: UniversityEntry[]): string[] {
  return entries.map((e) => e.name);
}

/** Shorthand for default settings seed data. */
export function universityEntriesFromNames(names: string[]): UniversityEntry[] {
  return names.map((name) => ({
    name,
    requirements: "",
    attachments: [],
    findCourseUrl: "",
    englishRequirementsUrl: "",
  }));
}

/** One row per Settings entry (same count as University requirements / destination cards). */
export type UniversityListFilterOption = { value: string; label: string };

/**
 * Build options for the Students "University" filter from Settings → countries.
 * Does not dedupe by name: the same name under two countries yields two options (matches admin counts).
 * Option `value` is JSON.stringify([country, name]) for stable matching on admission rows.
 */
export function buildUniversityFilterOptionsFromCountries(countries: unknown[]): UniversityListFilterOption[] {
  const pairs: { country: string; name: string }[] = [];
  if (!Array.isArray(countries)) return [];
  for (const c of countries) {
    if (c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string") {
      const row = c as { name: string; universities?: unknown[] };
      const names = universityEntryNames(normalizeUniversitiesArray(row.universities));
      for (const name of names) {
        pairs.push({ country: row.name, name });
      }
    }
  }
  const nameCount = new Map<string, number>();
  for (const p of pairs) {
    nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1);
  }
  return pairs.map((p) => ({
    value: JSON.stringify([p.country, p.name]),
    label: (nameCount.get(p.name) ?? 0) > 1 ? `${p.name} (${p.country})` : p.name,
  }));
}

/** Students list filter value: JSON pair from {@link buildUniversityFilterOptionsFromCountries}, or legacy plain name. */
export function parseUniversityListFilterValue(filterValue: string): { country: string; name: string } | null {
  if (!filterValue) return null;
  try {
    const parsed = JSON.parse(filterValue) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === "string" &&
      typeof parsed[1] === "string"
    ) {
      return { country: parsed[0], name: parsed[1] };
    }
  } catch {
    /* legacy plain university name */
  }
  return null;
}

export function admissionEntryMatchesUniversityFilter(
  filterValue: string,
  ad: { country?: string; universityName?: string },
): boolean {
  if (!filterValue) return true;
  const pair = parseUniversityListFilterValue(filterValue);
  if (pair) return ad.country === pair.country && (ad.universityName || "") === pair.name;
  return (ad.universityName || "") === filterValue;
}
