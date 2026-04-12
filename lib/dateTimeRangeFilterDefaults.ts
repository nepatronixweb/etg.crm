const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Leads / enquiries `datetime-local` "From": after a date is chosen, use 1:00 AM local on that day.
 */
export function withLeadFilterDefaultFromTime(value: string): string {
  if (!value?.trim()) return "";
  const m = value.trim().match(DATE_PREFIX);
  if (!m) return value.trim();
  return `${m[1]}T01:00`;
}

/**
 * Leads / enquiries `datetime-local` "To": after a date is chosen, use 11:00 PM local on that day.
 */
export function withLeadFilterDefaultToTime(value: string): string {
  if (!value?.trim()) return "";
  const m = value.trim().match(DATE_PREFIX);
  if (!m) return value.trim();
  return `${m[1]}T23:00`;
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
 * Legacy `?from` / `?to` with date-only `YYYY-MM-DD` (same 1:00 / 23:00 local wall-time rule as the UI defaults).
 */
export function parseCreatedAtDateOnlyBound(rawYmd: string, bound: "from" | "to"): Date {
  const s = rawYmd.trim();
  if (bound === "from") return new Date(`${s}T01:00:00`);
  return new Date(`${s}T23:00:00`);
}
