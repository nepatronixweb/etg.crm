import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import Organization from "@/models/Organization";
import User from "@/models/User";
import Branch from "@/models/Branch";
import { APP_SETTINGS_PLATFORM_FILTER } from "@/lib/appSettingsScope";
import { resolveBrandingAssetUrl } from "@/lib/brandingUrls";
import { normalizeHexColor } from "@/lib/brandTheme";

export type LoginBrandingPayload = {
  companyName: string;
  shortCode: string;
  tagline: string;
  logoPath: string;
  brandColor: string;
  brandSecondaryColor: string;
};

const PLATFORM_DEFAULTS: LoginBrandingPayload = {
  companyName: "Education Tree Global",
  shortCode: "ETG",
  tagline: "CRM Portal — Staff Access",
  logoPath: "",
  brandColor: "#2563eb",
  brandSecondaryColor: "#1d4ed8",
};

function payloadFromSettings(
  row: Record<string, unknown> | null | undefined,
  orgName?: string
): LoginBrandingPayload {
  if (!row) {
    return orgName
      ? { ...PLATFORM_DEFAULTS, companyName: orgName, shortCode: orgName.slice(0, 5).toUpperCase() || "ORG" }
      : PLATFORM_DEFAULTS;
  }
  const primary = normalizeHexColor(String(row.brandColor ?? PLATFORM_DEFAULTS.brandColor));
  const secondary = normalizeHexColor(
    String(row.brandSecondaryColor || row.brandColor || PLATFORM_DEFAULTS.brandSecondaryColor)
  );
  return {
    companyName: String(row.companyName || orgName || PLATFORM_DEFAULTS.companyName),
    shortCode: String(row.shortCode || PLATFORM_DEFAULTS.shortCode),
    tagline: String(row.tagline || PLATFORM_DEFAULTS.tagline),
    logoPath: resolveBrandingAssetUrl(String(row.logoPath ?? "")),
    brandColor: primary,
    brandSecondaryColor: secondary,
  };
}

export async function resolveLoginBrandingForEmail(emailRaw?: string | null): Promise<LoginBrandingPayload> {
  await connectDB();
  const platform = await AppSettings.findOne(APP_SETTINGS_PLATFORM_FILTER).lean();
  const platformPayload = payloadFromSettings(platform as Record<string, unknown> | null);

  const email = emailRaw?.trim().toLowerCase();
  if (!email) return platformPayload;

  const user = await User.findOne({ email }).select("branch").lean();
  if (!user?.branch) return platformPayload;

  const branch = await Branch.findById(user.branch).select("organization").lean();
  if (!branch?.organization) return platformPayload;

  const org = await Organization.findById(branch.organization).select("name").lean();
  const tenant = await AppSettings.findOne({ organization: branch.organization }).lean();
  return payloadFromSettings(tenant as Record<string, unknown> | null, org?.name);
}
