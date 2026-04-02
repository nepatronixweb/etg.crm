/** Normalized university row under a destination country (Settings → Countries). */

export type UniversityAttachment = {
  path: string;
  originalName: string;
};

export type UniversityEntry = {
  name: string;
  requirements: string;
  attachments: UniversityAttachment[];
};

export function normalizeUniversityEntry(u: unknown): UniversityEntry {
  if (typeof u === "string") {
    const name = u.trim();
    return { name, requirements: "", attachments: [] };
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
    };
  }
  return { name: "", requirements: "", attachments: [] };
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
  return names.map((name) => ({ name, requirements: "", attachments: [] }));
}
