import type { IOrganizationDocument } from "@/models/Organization";

export const ORGANIZATION_TRIAL_DAYS = 15;

export function trialEndsAtFromNow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ORGANIZATION_TRIAL_DAYS);
  return d;
}

/** Server-side access check for a loaded organization document. */
export function evaluateOrganizationAccess(
  org: Pick<IOrganizationDocument, "subscriptionStatus" | "trialEndsAt" | "paidThrough"> | null
): boolean {
  if (!org) return false;
  const now = Date.now();

  if (org.subscriptionStatus === "suspended") return false;
  if (org.subscriptionStatus === "expired") return false;

  if (org.subscriptionStatus === "trialing") {
    if (!org.trialEndsAt) return false;
    return new Date(org.trialEndsAt).getTime() > now;
  }

  if (org.subscriptionStatus === "active") {
    if (org.paidThrough && new Date(org.paidThrough).getTime() < now) return false;
    return true;
  }

  return false;
}

/** If trial window passed but status still says trialing, treat as no access and optionally persist expired. */
export function shouldMarkTrialExpired(
  org: Pick<IOrganizationDocument, "subscriptionStatus" | "trialEndsAt">
): boolean {
  if (org.subscriptionStatus !== "trialing" || !org.trialEndsAt) return false;
  return new Date(org.trialEndsAt).getTime() <= Date.now();
}
