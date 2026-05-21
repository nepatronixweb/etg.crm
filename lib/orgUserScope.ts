import mongoose from "mongoose";
import type { Session } from "next-auth";
import Branch from "@/models/Branch";
import User from "@/models/User";

export async function getBranchIdsInOrganization(orgId: string): Promise<mongoose.Types.ObjectId[]> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) return [];
  const oid = new mongoose.Types.ObjectId(orgId);
  const ids = await Branch.find({ organization: oid }).distinct("_id");
  return ids as mongoose.Types.ObjectId[];
}

/** Fail-closed when tenant scope cannot be resolved (prevents cross-tenant data leaks). */
export const TENANT_SCOPE_EMPTY_MATCH = { _id: { $exists: false } } as const;

/**
 * Mongo filter fragment: branches this session may access.
 * - super_admin: no branch restriction (caller may add query params)
 * - org users: all branches in their organization
 * - fallback: single session branch
 * - unknown: match nothing
 */
export async function tenantBranchScopeForSession(
  session: Session
): Promise<Record<string, unknown>> {
  if (session.user.role === "super_admin") return {};

  const orgId = session.user.organizationId;
  if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
    const branchIds = await getBranchIdsInOrganization(orgId);
    if (branchIds.length > 0) return { branch: { $in: branchIds } };
  }

  const branchId = session.user.branch ? String(session.user.branch).trim() : "";
  if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
    return { branch: new mongoose.Types.ObjectId(branchId) };
  }

  return { ...TENANT_SCOPE_EMPTY_MATCH };
}

export async function isUserInOrganization(userId: string, orgId: string): Promise<boolean> {
  const branchIds = await getBranchIdsInOrganization(orgId);
  if (branchIds.length === 0) return false;
  const u = await User.findById(userId).select("branch").lean();
  if (!u?.branch) return false;
  const bid = String(u.branch);
  return branchIds.some((id) => id.toString() === bid);
}

export async function isBranchInOrganization(branchId: string, orgId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(orgId)) return false;
  const br = await Branch.findOne({ _id: branchId, organization: orgId }).select("_id").lean();
  return !!br;
}
