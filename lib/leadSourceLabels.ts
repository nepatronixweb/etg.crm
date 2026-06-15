/** Same normalization as POST/PUT /api/leads and the leads form. */
export function normalizeLeadSourceValue(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Human label for a stored lead `source` value using Settings → Lead Sources. */
export function leadSourceLabelFromList(
  configuredSources: string[],
  storedValue: string | undefined | null
): string {
  if (!storedValue) return "";
  const norm = normalizeLeadSourceValue(storedValue);
  const match = configuredSources.find((s) => normalizeLeadSourceValue(s) === norm);
  if (match) return match;
  return storedValue.replace(/_/g, " ");
}
