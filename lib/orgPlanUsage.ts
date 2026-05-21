import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Branch from "@/models/Branch";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Organization from "@/models/Organization";
import {
  normalizeOrganizationPlan,
  ORG_PLANS,
  planLimitFor,
  type OrganizationPlan,
  type PlanLimitKey,
} from "@/lib/orgPlans";

export type OrgUsageSnapshot = {
  users: number;
  branches: number;
  leads: number;
};

export type OrgPlanUsagePayload = {
  organizationId: string;
  organizationName: string;
  plan: OrganizationPlan;
  planLabel: string;
  planDescription: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  paidThrough: string | null;
  orgAccessAllowed: boolean;
  usage: OrgUsageSnapshot;
  limits: {
    users: number | null;
    branches: number | null;
    leads: number | null;
  };
};

async function branchIdsForOrg(orgId: string): Promise<mongoose.Types.ObjectId[]> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) return [];
  const ids = await Branch.find({ organization: orgId }).distinct("_id");
  return ids as mongoose.Types.ObjectId[];
}

export async function getOrganizationUsage(orgId: string): Promise<OrgUsageSnapshot> {
  await connectDB();
  const branchIds = await branchIdsForOrg(orgId);
  if (branchIds.length === 0) {
    return { users: 0, branches: 0, leads: 0 };
  }
  const branchFilter = { branch: { $in: branchIds } };
  const [users, branches, leads] = await Promise.all([
    User.countDocuments(branchFilter),
    branchIds.length,
    Lead.countDocuments(branchFilter),
  ]);
  return { users, branches, leads };
}

export async function getOrganizationPlanUsage(orgId: string): Promise<OrgPlanUsagePayload | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(orgId)) return null;
  const org = await Organization.findById(orgId).lean();
  if (!org) return null;

  const plan = normalizeOrganizationPlan(org.plan);
  const def = ORG_PLANS[plan];
  const usage = await getOrganizationUsage(orgId);

  return {
    organizationId: org._id.toString(),
    organizationName: org.name,
    plan,
    planLabel: def.label,
    planDescription: def.description,
    subscriptionStatus: org.subscriptionStatus,
    trialEndsAt: org.trialEndsAt ? new Date(org.trialEndsAt).toISOString() : null,
    paidThrough: org.paidThrough ? new Date(org.paidThrough).toISOString() : null,
    orgAccessAllowed: true,
    usage,
    limits: {
      users: def.maxUsers,
      branches: def.maxBranches,
      leads: def.maxLeads,
    },
  };
}

export type PlanLimitCheckResult =
  | { ok: true }
  | { ok: false; error: string; code: "plan_limit_reached"; resource: PlanLimitKey; limit: number; current: number };

export async function assertOrgPlanLimit(
  orgId: string,
  resource: PlanLimitKey,
  options?: { planOverride?: OrganizationPlan }
): Promise<PlanLimitCheckResult> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return { ok: false, error: "Organization not found.", code: "plan_limit_reached", resource, limit: 0, current: 0 };
  }

  const org = await Organization.findById(orgId).select("plan subscriptionStatus").lean();
  if (!org) {
    return { ok: false, error: "Organization not found.", code: "plan_limit_reached", resource, limit: 0, current: 0 };
  }

  const plan = options?.planOverride ?? normalizeOrganizationPlan(org.plan);
  const limit = planLimitFor(plan, resource);
  if (limit == null) return { ok: true };

  const usage = await getOrganizationUsage(orgId);
  const current =
    resource === "users" ? usage.users : resource === "branches" ? usage.branches : usage.leads;

  if (current >= limit) {
    const label = resource === "users" ? "users" : resource === "branches" ? "branches" : "leads";
    const planLabel = ORG_PLANS[plan].label;
    return {
      ok: false,
      error: `${planLabel} plan allows up to ${limit.toLocaleString()} ${label}. Upgrade your plan to add more.`,
      code: "plan_limit_reached",
      resource,
      limit,
      current,
    };
  }

  return { ok: true };
}
