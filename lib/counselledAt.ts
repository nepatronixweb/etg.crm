export type CounselledEvent = { atIso: string; sourceLabel: string };

/** Human-readable elapsed since counselling status timestamp (for UI clocks). */
export function formatCounselingElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/** Prefer lead origin, then enquiry (students created from enquiry). */
export function getCounselledEventFromStudentOrigin(origin: {
  lead?: { statusDates?: unknown } | null;
  enquiry?: { statusDates?: unknown } | null;
}): CounselledEvent | null {
  const fromLead = getCounselledEvent(origin.lead?.statusDates);
  if (fromLead) return fromLead;
  return getCounselledEvent(origin.enquiry?.statusDates);
}

function coerceDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(typeof v === "string" || typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Prefer FD status "Counselled", then "Phone Counselling" (phone pathway). */
export function getCounselledEvent(statusDates: unknown): CounselledEvent | null {
  if (!statusDates || typeof statusDates !== "object") return null;
  const o = statusDates as Record<string, unknown>;
  const counselled = coerceDate(o.Counselled);
  const phone = coerceDate(o["Phone Counselling"]);
  if (counselled) return { atIso: counselled.toISOString(), sourceLabel: "Counselled" };
  if (phone) return { atIso: phone.toISOString(), sourceLabel: "Phone counselling" };
  return null;
}
