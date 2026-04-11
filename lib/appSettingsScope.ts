import mongoose from "mongoose";
import type { Session } from "next-auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import Organization from "@/models/Organization";
import { DEFAULT_APPLICATION_ROLES } from "@/lib/applicationRoles";

type AppSettingsDoc = NonNullable<Awaited<ReturnType<typeof AppSettings.findOne>>>;

/** Unique index only applies to real tenant ObjectIds; platform rows use `organization: null`. */
export const APP_SETTINGS_PLATFORM_FILTER = { organization: null } as const;

function sessionToOrgFilter(session: Session | null): { organization: mongoose.Types.ObjectId | null } {
  if (!session?.user) return { organization: null };
  if (session.user.role === "super_admin") return { organization: null };
  const oid = session.user.organizationId;
  if (oid && mongoose.Types.ObjectId.isValid(oid)) {
    return { organization: new mongoose.Types.ObjectId(oid) };
  }
  return { organization: null };
}

/** Backfill `organization: null` on legacy singleton rows (field previously omitted). */
export async function migrateAppSettingsOrganizationField(): Promise<void> {
  await connectDB();
  await AppSettings.updateMany({ organization: { $exists: false } }, { $set: { organization: null } });
}

const DEFAULT_ENABLED_MODULES = [
  "leads",
  "students",
  "documents",
  "applications",
  "admissions",
  "visa",
  "analytics",
  "branches",
  "users",
  "activity_logs",
  "settings",
  "commission",
  "inventory",
  "hr",
  "chat",
] as const;

export async function createTenantAppSettings(
  organizationId: mongoose.Types.ObjectId,
  displayName: string
): Promise<AppSettingsDoc> {
  await connectDB();
  const exists = await AppSettings.findOne({ organization: organizationId });
  if (exists) return exists;
  const base = displayName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
  const shortCode = base.length >= 2 ? base : "ORG";
  return AppSettings.create({
    organization: organizationId,
    companyName: displayName.trim() || "Organization",
    shortCode,
    tagline: "CRM",
  });
}

/**
 * Free-trial / new trial orgs: no prefilled countries, courses, services, pipeline presets, or telecaller rules.
 * Role definitions and module toggles stay so the product works; tenants fill lists from Settings.
 */
export async function createFreshTrialTenantAppSettings(
  organizationId: mongoose.Types.ObjectId,
  displayName: string,
  options?: { session?: mongoose.ClientSession | null }
): Promise<AppSettingsDoc> {
  await connectDB();
  const q = AppSettings.findOne({ organization: organizationId });
  if (options?.session) q.session(options.session);
  const exists = await q;
  if (exists) return exists;
  const base = displayName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
  const shortCode = base.length >= 2 ? base : "ORG";
  const row = {
    organization: organizationId,
    companyName: displayName.trim() || "Organization",
    shortCode,
    tagline: "",
    logoPath: "",
    faviconPath: "",
    brandColor: "#2563eb",
    address: "",
    phone: "",
    email: "",
    website: "",
    leadStatuses: [],
    leadSources: [],
    leadStandings: ["warm"],
    fdStatuses: ["Open/Unassigned"],
    leadStageGroups: [],
    leadStages: [],
    countryStages: {},
    stageToPipelineMapping: {},
    b2bNames: [],
    remarkOptions: [],
    remarkOptionsApplication: [],
    remarkOptionsAdmission: [],
    remarkOptionsVisa: [],
    countries: [],
    services: [],
    courses: [],
    educationLevels: [],
    enabledModules: [...DEFAULT_ENABLED_MODULES],
    commissionPercentByCountry: {},
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    emailFromName: "",
    paymentQrPath: "",
    applicationRoles: DEFAULT_APPLICATION_ROLES.map((r) => ({
      slug: r.slug,
      label: r.label,
      defaultPermissions: [...r.defaultPermissions],
    })),
    telecallerTransferOutcomes: [],
    dashboardWidgets: {},
    dashboardWidgetOrder: {},
  };
  if (options?.session) {
    const [created] = await AppSettings.create([row], { session: options.session });
    return created;
  }
  return AppSettings.create(row);
}

/**
 * Document used for GET backfills and PUT updates.
 * - Logged-out / login page: platform (`organization: null`).
 * - super_admin: platform (ETG master settings).
 * - Other users: their tenant row; created on demand from `Organization` name (schema defaults = fresh lists).
 */
export async function getAppSettingsDocumentForSession(
  session: Session | null
): Promise<AppSettingsDoc> {
  await connectDB();
  await migrateAppSettingsOrganizationField();
  const filter = sessionToOrgFilter(session);
  let doc = await AppSettings.findOne(filter);
  if (!doc && filter.organization) {
    const org = await Organization.findById(filter.organization);
    if (org) {
      doc = await createTenantAppSettings(filter.organization, org.name);
    }
  }
  if (!doc) {
    doc = await AppSettings.findOne(APP_SETTINGS_PLATFORM_FILTER);
    if (!doc) doc = await AppSettings.create({ organization: null });
  }
  return doc;
}

export async function getAppSettingsLeanForOrganizationId(
  organizationId: string | null | undefined
): Promise<Record<string, unknown> | null> {
  await connectDB();
  await migrateAppSettingsOrganizationField();
  if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
    const row = await AppSettings.findOne({
      organization: new mongoose.Types.ObjectId(organizationId),
    }).lean();
    if (row) return row as unknown as Record<string, unknown>;
  }
  const plat = await AppSettings.findOne(APP_SETTINGS_PLATFORM_FILTER).lean();
  return (plat as unknown as Record<string, unknown> | null) ?? null;
}
