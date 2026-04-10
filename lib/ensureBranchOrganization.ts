import mongoose from "mongoose";
import Branch from "@/models/Branch";
import Organization from "@/models/Organization";
import { trialEndsAtFromNow } from "@/lib/organizationAccess";
import type { IOrganizationDocument } from "@/models/Organization";
import { createFreshTrialTenantAppSettings, createTenantAppSettings } from "@/lib/appSettingsScope";

/**
 * Legacy branches without `organization` get a grandfathered **active** org so existing deployments keep working.
 * New companies should use `createTrialOrganization` + branch link instead.
 */
export async function ensureBranchLinkedToOrganization(
  branchId: string
): Promise<IOrganizationDocument | null> {
  const branch = await Branch.findById(branchId);
  if (!branch) return null;

  if (branch.organization) {
    const org = await Organization.findById(branch.organization);
    return org;
  }

  const org = await Organization.create({
    name: `${branch.name} — Organization`,
    subscriptionStatus: "active",
    billingNote: "Migrated automatically (legacy branch had no organization).",
  });
  branch.organization = org._id;
  await branch.save();
  await createTenantAppSettings(org._id as mongoose.Types.ObjectId, org.name);
  return org;
}

export async function createTrialOrganization(name: string): Promise<IOrganizationDocument> {
  const org = await Organization.create({
    name: name.trim() || "New organization",
    subscriptionStatus: "trialing",
    trialEndsAt: trialEndsAtFromNow(),
  });
  await createFreshTrialTenantAppSettings(org._id as mongoose.Types.ObjectId, org.name);
  return org;
}
