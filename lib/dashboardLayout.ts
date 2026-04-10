/**
 * Dashboard widget visibility (dashboardWidgets) and per-audience order (dashboardWidgetOrder).
 * Missing visibility keys default to visible. Order defaults follow DEFAULT_WIDGET_ORDER.
 */

export type DashboardAudience =
  | "super_admin"
  | "counsellor"
  | "front_desk"
  | "admission_team"
  | "telecaller"
  | "other";

export type DashboardWidgetDef = {
  id: string;
  label: string;
  description: string;
  audience: DashboardAudience;
};

/** Admin analytics cards that share one responsive row when adjacent in sort order. */
export const ADMIN_CHART_WIDGET_IDS = [
  "admin_leads_by_source",
  "admin_students_by_stage",
  "admin_applications_by_country",
] as const;

export type AdminChartWidgetId = (typeof ADMIN_CHART_WIDGET_IDS)[number];

/** Admin summary metrics; consecutive ids render as one row and can be reordered together on the dashboard. */
export const ADMIN_KPI_CARD_IDS = [
  "admin_kpi_total_leads",
  "admin_kpi_students",
  "admin_kpi_applications",
  "admin_kpi_conversion",
  "admin_kpi_counselled",
] as const;

export type AdminKpiCardId = (typeof ADMIN_KPI_CARD_IDS)[number];

export const DASHBOARD_WIDGET_DEFINITIONS: DashboardWidgetDef[] = [
  {
    id: "admin_kpi_total_leads",
    label: "KPI: Total leads",
    description: "Total leads and conversions snapshot (super admin / org admin).",
    audience: "super_admin",
  },
  {
    id: "admin_kpi_students",
    label: "KPI: Students",
    description: "Student count for the selected period.",
    audience: "super_admin",
  },
  {
    id: "admin_kpi_applications",
    label: "KPI: Applications",
    description: "Application count for the selected period.",
    audience: "super_admin",
  },
  {
    id: "admin_kpi_conversion",
    label: "KPI: Conversion rate",
    description: "Lead to student conversion percentage.",
    audience: "super_admin",
  },
  {
    id: "admin_kpi_counselled",
    label: "KPI: Counselled",
    description: "Leads marked Counselled or phone counselling in period.",
    audience: "super_admin",
  },
  {
    id: "admin_pipeline",
    label: "Admissions & visa pipeline",
    description: "GS, COE, offers, visa lodged / granted / rejected strip.",
    audience: "super_admin",
  },
  {
    id: "admin_leads_by_source",
    label: "Leads by source",
    description: "Bar breakdown of lead sources for the selected period.",
    audience: "super_admin",
  },
  {
    id: "admin_students_by_stage",
    label: "Students by stage",
    description: "Pipeline distribution by student stage.",
    audience: "super_admin",
  },
  {
    id: "admin_applications_by_country",
    label: "Applications by country",
    description: "Top destination countries for applications.",
    audience: "super_admin",
  },
  {
    id: "admin_application_status",
    label: "Applications by status",
    description: "Application outcome breakdown grid.",
    audience: "super_admin",
  },
  {
    id: "admin_recent_targets",
    label: "Recent leads & counsellor targets",
    description: "Recent leads table and counsellor target progress.",
    audience: "super_admin",
  },
  {
    id: "admin_lead_standing",
    label: "Lead standing distribution",
    description: "Standing bar and breakdown cards.",
    audience: "super_admin",
  },
  {
    id: "admin_activity",
    label: "Recent activity",
    description: "Activity log stream on the dashboard.",
    audience: "super_admin",
  },
  {
    id: "admin_notifications",
    label: "Notifications (admin)",
    description: "Notification list on the admin dashboard.",
    audience: "super_admin",
  },
  {
    id: "counsellor_summary",
    label: "Counsellor lead stats & pipeline",
    description: "Temperature cards, student pipeline snapshot, and out-of-contact alert.",
    audience: "counsellor",
  },
  {
    id: "counsellor_leads_list",
    label: "Counsellor assigned leads",
    description: "Main assigned leads list.",
    audience: "counsellor",
  },
  {
    id: "counsellor_notifications",
    label: "Counsellor notifications",
    description: "Notifications column beside leads.",
    audience: "counsellor",
  },
  {
    id: "counsellor_remarks",
    label: "Counsellor recent remarks",
    description: "Recent student remarks panel.",
    audience: "counsellor",
  },
  {
    id: "front_desk_stats",
    label: "Front desk stat cards",
    description: "Total leads, converted, enrolled cards.",
    audience: "front_desk",
  },
  {
    id: "admission_dashboard",
    label: "Admission team dashboard",
    description: "All admission stats rows and recent remarks.",
    audience: "admission_team",
  },
  {
    id: "telecaller_header",
    label: "Telecaller header & import",
    description: "Title bar and import leads button.",
    audience: "telecaller",
  },
  {
    id: "telecaller_today_targets",
    label: "Telecaller today’s targets",
    description: "Calls, appointments, phone counselling progress.",
    audience: "telecaller",
  },
  {
    id: "telecaller_overview_primary",
    label: "Telecaller lead overview (primary)",
    description: "Total, fresh, transferred, appointment tiles.",
    audience: "telecaller",
  },
  {
    id: "telecaller_overview_secondary",
    label: "Telecaller lead overview (secondary)",
    description: "Phone counselling, online enrollment, cold, CNR tiles.",
    audience: "telecaller",
  },
  {
    id: "telecaller_recent_leads",
    label: "Telecaller recent leads",
    description: "Recent assigned enquiries list.",
    audience: "telecaller",
  },
  {
    id: "staff_inventory_summary",
    label: "Inventory summary (dashboard)",
    description: "Compact inventory widgets for users with inventory access.",
    audience: "other",
  },
  {
    id: "generic_quick_links",
    label: "Quick module links",
    description: "Leads / Students shortcuts for other roles.",
    audience: "other",
  },
];

const LEGACY_CHART_ROW_ID = "admin_charts_row";
const LEGACY_ADMIN_KPIS_ID = "admin_kpis";

const AUDIENCE_LABEL: Record<DashboardAudience, string> = {
  super_admin: "Super admin / org admin",
  counsellor: "Counsellor",
  front_desk: "Front desk",
  admission_team: "Admission team",
  telecaller: "Telecaller",
  other: "Other roles",
};

/** Default vertical order per audience (also used when no custom order is stored). */
export const DEFAULT_WIDGET_ORDER: Record<DashboardAudience, string[]> = {
  super_admin: [
    ...ADMIN_KPI_CARD_IDS,
    "admin_pipeline",
    "admin_leads_by_source",
    "admin_students_by_stage",
    "admin_applications_by_country",
    "admin_application_status",
    "admin_recent_targets",
    "admin_lead_standing",
    "admin_activity",
    "admin_notifications",
  ],
  counsellor: [
    "counsellor_summary",
    "counsellor_leads_list",
    "counsellor_notifications",
    "counsellor_remarks",
  ],
  front_desk: ["front_desk_stats"],
  admission_team: ["admission_dashboard"],
  telecaller: [
    "telecaller_header",
    "telecaller_today_targets",
    "telecaller_overview_primary",
    "telecaller_overview_secondary",
    "telecaller_recent_leads",
  ],
  other: ["staff_inventory_summary", "generic_quick_links"],
};

const CHART_ID_SET = new Set<string>(ADMIN_CHART_WIDGET_IDS);
const KPI_ID_SET = new Set<string>(ADMIN_KPI_CARD_IDS);

/** Counsellor uses a fixed two-row layout (summary, then leads + sidebar); drag-order is not applied on the live dashboard. */
export function audienceSupportsOrderCustomization(audience: DashboardAudience): boolean {
  return audience !== "counsellor";
}

/** Map CRM role slug to dashboard widget audience (used for per-user layout). */
export function roleSlugToDashboardAudience(role: string): DashboardAudience {
  if (role === "super_admin" || role === "org_admin") return "super_admin";
  if (role === "counsellor") return "counsellor";
  if (role === "front_desk") return "front_desk";
  if (role === "admission_team") return "admission_team";
  if (role === "telecaller") return "telecaller";
  return "other";
}

/** Tenant-wide merged visibility + per-user overrides (user keys win). */
export function mergeDashboardWidgetsWithUserOverrides(
  tenantMerged: Record<string, boolean>,
  userOverrides: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  if (!userOverrides || typeof userOverrides !== "object") return { ...tenantMerged };
  let user = { ...userOverrides };
  if (Object.prototype.hasOwnProperty.call(user, LEGACY_ADMIN_KPIS_ID)) {
    const v = Boolean(user[LEGACY_ADMIN_KPIS_ID]);
    delete user[LEGACY_ADMIN_KPIS_ID];
    for (const id of ADMIN_KPI_CARD_IDS) {
      if (!Object.prototype.hasOwnProperty.call(userOverrides, id)) {
        user[id] = v;
      }
    }
  }
  return { ...tenantMerged, ...user };
}

/** Merge order: base (e.g. org Settings) then per-user overrides per audience when non-empty. */
export function mergeDashboardWidgetOrderStates(
  base: DashboardWidgetOrderState,
  override: DashboardWidgetOrderState | null | undefined
): DashboardWidgetOrderState {
  if (!override || typeof override !== "object") return { ...base };
  const out: DashboardWidgetOrderState = { ...base };
  for (const aud of Object.keys(DEFAULT_WIDGET_ORDER) as DashboardAudience[]) {
    const arr = override[aud];
    if (Array.isArray(arr) && arr.length > 0) {
      out[aud] = migrateOrderIds(arr.map((x) => String(x)));
    }
  }
  return out;
}

export function dashboardWidgetsByAudience(): { audience: DashboardAudience; title: string; widgets: DashboardWidgetDef[] }[] {
  const order: DashboardAudience[] = [
    "super_admin",
    "counsellor",
    "front_desk",
    "admission_team",
    "telecaller",
    "other",
  ];
  return order.map((audience) => ({
    audience,
    title: AUDIENCE_LABEL[audience],
    widgets: DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === audience),
  }));
}

export function defaultDashboardWidgets(): Record<string, boolean> {
  const o: Record<string, boolean> = {};
  for (const w of DASHBOARD_WIDGET_DEFINITIONS) {
    o[w.id] = true;
  }
  return o;
}

function migrateLegacyChartVisibility(s: Record<string, unknown>, base: Record<string, boolean>): void {
  if (Object.prototype.hasOwnProperty.call(s, LEGACY_CHART_ROW_ID) && s[LEGACY_CHART_ROW_ID] === false) {
    for (const id of ADMIN_CHART_WIDGET_IDS) {
      base[id] = false;
    }
  }
}

function migrateLegacyKpiVisibility(s: Record<string, unknown>, base: Record<string, boolean>): void {
  if (!Object.prototype.hasOwnProperty.call(s, LEGACY_ADMIN_KPIS_ID)) return;
  const v = Boolean(s[LEGACY_ADMIN_KPIS_ID]);
  for (const id of ADMIN_KPI_CARD_IDS) {
    if (!Object.prototype.hasOwnProperty.call(s, id)) {
      base[id] = v;
    }
  }
}

/** Merge API value with defaults; migrate legacy `admin_charts_row`. */
export function mergeDashboardWidgetsFromApi(stored: unknown): Record<string, boolean> {
  const base = defaultDashboardWidgets();
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return base;
  const s = stored as Record<string, unknown>;
  migrateLegacyChartVisibility(s, base);
  migrateLegacyKpiVisibility(s, base);
  for (const w of DASHBOARD_WIDGET_DEFINITIONS) {
    if (Object.prototype.hasOwnProperty.call(s, w.id)) {
      base[w.id] = Boolean(s[w.id]);
    }
  }
  return base;
}

export function isDashboardWidgetVisible(
  id: string,
  stored: Record<string, boolean> | null | undefined
): boolean {
  if (!stored || typeof stored !== "object") return true;
  return stored[id] !== false;
}

function migrateOrderIds(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (id === LEGACY_CHART_ROW_ID) {
      out.push(...ADMIN_CHART_WIDGET_IDS);
    } else if (id === LEGACY_ADMIN_KPIS_ID) {
      out.push(...ADMIN_KPI_CARD_IDS);
    } else {
      out.push(id);
    }
  }
  return out;
}

export type DashboardWidgetOrderState = Partial<Record<DashboardAudience, string[]>>;

export function mergeDashboardWidgetOrderFromApi(stored: unknown): DashboardWidgetOrderState {
  const result: DashboardWidgetOrderState = {};
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return result;
  const raw = stored as Record<string, unknown>;
  for (const aud of Object.keys(DEFAULT_WIDGET_ORDER) as DashboardAudience[]) {
    const row = raw[aud];
    if (!Array.isArray(row)) continue;
    const migrated = migrateOrderIds(row.map((x) => String(x)));
    const allowed = new Set(
      DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === aud).map((w) => w.id)
    );
    const filtered = migrated.filter((id) => allowed.has(id));
    if (filtered.length > 0) result[aud] = filtered;
  }
  return result;
}

/** Full order for an audience: custom sequence plus any missing ids appended (defaults). */
export function resolveOrderedWidgetIds(
  audience: DashboardAudience,
  visibility: Record<string, boolean>,
  orderStored: DashboardWidgetOrderState | null | undefined
): string[] {
  const allowed = new Set(
    DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === audience).map((w) => w.id)
  );
  const def = DEFAULT_WIDGET_ORDER[audience];
  const custom = audienceSupportsOrderCustomization(audience)
    ? orderStored?.[audience]?.filter((id) => allowed.has(id)) ?? []
    : [...def];
  const merged: string[] = [...custom];
  for (const id of def) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged.filter((id) => isDashboardWidgetVisible(id, visibility));
}

export type AdminDashboardChunk =
  | { type: "single"; id: string }
  | { type: "charts"; ids: AdminChartWidgetId[] }
  | { type: "kpis"; ids: AdminKpiCardId[] }
  | { type: "twin"; leftId: string; rightId: string };

function mergeAdjacentActivityNotification(chunks: AdminDashboardChunk[]): AdminDashboardChunk[] {
  const result: AdminDashboardChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const a = chunks[i];
    const b = chunks[i + 1];
    if (
      a.type === "single" &&
      b?.type === "single" &&
      ((a.id === "admin_activity" && b.id === "admin_notifications") ||
        (a.id === "admin_notifications" && b.id === "admin_activity"))
    ) {
      result.push({ type: "twin", leftId: a.id, rightId: b.id });
      i++;
    } else {
      result.push(a);
    }
  }
  return result;
}

export function buildAdminDashboardChunks(orderedVisibleIds: string[]): AdminDashboardChunk[] {
  const chunks: AdminDashboardChunk[] = [];
  let i = 0;
  while (i < orderedVisibleIds.length) {
    const id = orderedVisibleIds[i];
    if (CHART_ID_SET.has(id)) {
      const batch: AdminChartWidgetId[] = [];
      while (i < orderedVisibleIds.length) {
        const x = orderedVisibleIds[i];
        if (!CHART_ID_SET.has(x)) break;
        batch.push(x as AdminChartWidgetId);
        i++;
      }
      chunks.push({ type: "charts", ids: batch });
    } else if (KPI_ID_SET.has(id)) {
      const batch: AdminKpiCardId[] = [];
      while (i < orderedVisibleIds.length) {
        const x = orderedVisibleIds[i];
        if (!KPI_ID_SET.has(x)) break;
        batch.push(x as AdminKpiCardId);
        i++;
      }
      chunks.push({ type: "kpis", ids: batch });
    } else {
      chunks.push({ type: "single", id });
      i++;
    }
  }
  return mergeAdjacentActivityNotification(chunks);
}

/** Serialize admin chunk row order back to widget id order (for saving layout). */
export function flattenAdminDashboardChunksToOrder(chunks: AdminDashboardChunk[]): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    if (c.type === "single") out.push(c.id);
    else if (c.type === "charts") out.push(...c.ids);
    else if (c.type === "kpis") out.push(...c.ids);
    else if (c.type === "twin") {
      out.push(c.leftId, c.rightId);
    }
  }
  return out;
}

/** Resolved order for settings UI (includes hidden widgets so order can be edited). */
export function resolveWidgetIdsForSettingsEditor(
  audience: DashboardAudience,
  orderStored: DashboardWidgetOrderState | null | undefined
): string[] {
  const validIds = new Set(
    DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === audience).map((w) => w.id)
  );
  const def = DEFAULT_WIDGET_ORDER[audience];
  const custom = audienceSupportsOrderCustomization(audience)
    ? orderStored?.[audience]?.filter((id) => validIds.has(id)) ?? []
    : [...def];
  const merged: string[] = [...custom];
  for (const id of def) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}
