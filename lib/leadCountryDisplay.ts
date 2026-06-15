/** Pick the country label for list UI — when a filter is active, show the matching destination. */
export function resolveLeadCountryForDisplay(
  lead: {
    interestedCountry?: string;
    interestedCountries?: { country?: string; universityName?: string }[];
  },
  activeCountryFilter?: string
): string {
  const trimmedFilter = activeCountryFilter?.trim();
  const entries = (lead.interestedCountries ?? []).filter((e) => e.country?.trim());
  if (trimmedFilter) {
    const hit = entries.find((e) => e.country!.trim().toLowerCase() === trimmedFilter.toLowerCase());
    if (hit) return hit.country!.trim();
    const legacy = lead.interestedCountry?.trim();
    if (legacy && legacy.toLowerCase() === trimmedFilter.toLowerCase()) return legacy;
    return trimmedFilter;
  }
  return entries[0]?.country?.trim() || lead.interestedCountry?.trim() || "";
}
