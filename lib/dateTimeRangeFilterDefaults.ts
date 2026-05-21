const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** Office closing time for lead/enquiry date filters (local wall clock). */
export const OFFICE_DAY_END_HOUR = 19;
export const OFFICE_DAY_END_MINUTE = 0;

/**
 * Leads / enquiries date-only "From": start of calendar day (00:00 local).
 * Legacy datetime-local values (with T) are returned unchanged.
 */
export function withLeadFilterDefaultFromTime(value: string): string {
  if (!value?.trim()) return "";
  const t = value.trim();
  if (t.includes("T")) return t.slice(0, 16);
  const m = t.match(DATE_PREFIX);
  if (!m) return value.trim();
  return m[1];
}

/**
 * Leads / enquiries date-only "To": date portion only (bounds applied on parse).
 * Legacy datetime-local values (with T) are returned unchanged.
 */
export function withLeadFilterDefaultToTime(value: string): string {
  if (!value?.trim()) return "";
  const t = value.trim();
  if (t.includes("T")) return t.slice(0, 16);
  const m = t.match(DATE_PREFIX);
  if (!m) return value.trim();
  return m[1];
}

/** Analytics `type="date"` From → UTC ISO (1:00 AM local wall time). */
export function dateOnlyToAnalyticsFromIso(dateYmd: string): string {
  return new Date(`${dateYmd.trim()}T01:00:00`).toISOString();
}

/** Analytics `type="date"` To → UTC ISO (11:00 PM local wall time). */
export function dateOnlyToAnalyticsToIso(dateYmd: string): string {
  return new Date(`${dateYmd.trim()}T23:00:00`).toISOString();
}

/**
 * Lead / enquiry `?from` / `?to` with date-only `YYYY-MM-DD`:
 * - From: start of day (00:00 local)
 * - To: end of office day (19:00 local — 7 PM closing)
 */
export function parseCreatedAtDateOnlyBound(rawYmd: string, bound: "from" | "to"): Date {
  const s = rawYmd.trim();
  if (bound === "from") return new Date(`${s}T00:00:00`);
  const hh = String(OFFICE_DAY_END_HOUR).padStart(2, "0");
  const mm = String(OFFICE_DAY_END_MINUTE).padStart(2, "0");
  return new Date(`${s}T${hh}:${mm}:00`);
}
