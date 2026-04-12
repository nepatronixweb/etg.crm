import { FD_STATUSES } from "@/lib/utils";

export type FdStatusOption = { value: string; label: string; color: string };

/** Saturated pill styles for custom statuses not listed in {@link FD_STATUSES}. */
const FD_STATUS_FALLBACK_PALETTE = [
  "bg-sky-600 text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-cyan-600 text-white",
  "bg-orange-600 text-white",
  "bg-indigo-600 text-white",
  "bg-fuchsia-600 text-white",
  "bg-teal-600 text-white",
] as const;

function normalizeFdStatusKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findFdStatusDefinition(value: string): (typeof FD_STATUSES)[number] | undefined {
  const exact = FD_STATUSES.find((f) => f.value === value);
  if (exact) return exact;
  const key = normalizeFdStatusKey(value);
  return FD_STATUSES.find((f) => normalizeFdStatusKey(f.value) === key);
}

function fdStatusColorFromPalette(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % FD_STATUS_FALLBACK_PALETTE.length;
  return FD_STATUS_FALLBACK_PALETTE[idx];
}

/** Tailwind classes for a workflow status value (known default or stable color per unknown string). */
export function resolveFdStatusColorClass(value: string): string {
  return findFdStatusDefinition(value)?.color ?? fdStatusColorFromPalette(value);
}

export function fdStatusOptionsFromStrings(list: string[]): FdStatusOption[] {
  return list.map((s) => {
    const def = findFdStatusDefinition(s);
    return def
      ? { value: s, label: def.label, color: def.color }
      : { value: s, label: s, color: fdStatusColorFromPalette(s) };
  });
}

/** Label + pill classes for dashboard/reports (pass options from the same source as leads UI). */
export function resolveFdStatusPresentation(
  options: FdStatusOption[],
  value: string | undefined | null,
): { label: string; colorClass: string } {
  if (value == null || value === "") {
    return { label: "", colorClass: "border border-gray-200 bg-white text-gray-600" };
  }
  const o = options.find((x) => x.value === value);
  if (o) return { label: o.label, colorClass: o.color };
  return { label: value, colorClass: resolveFdStatusColorClass(value) };
}

/**
 * Admin-configured list for pickers. If the record still has a value removed from settings,
 * append it once so the user can see it and change away.
 */
export function fdWorkflowChoicesForPicker(
  fromSettings: FdStatusOption[],
  currentValue?: string | null,
): FdStatusOption[] {
  if (currentValue == null || currentValue === "") return fromSettings;
  if (fromSettings.some((o) => o.value === currentValue)) return fromSettings;
  return [
    ...fromSettings,
    {
      value: currentValue,
      label: `${currentValue} (legacy)`,
      color: resolveFdStatusColorClass(currentValue),
    },
  ];
}
