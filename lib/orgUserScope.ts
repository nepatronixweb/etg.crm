import mongoose from "mongoose";
import Branch from "@/models/Branch";
import User from "@/models/User";

export async function getBranchIdsInOrganization(orgId: string): Promise<mongoose.Types.ObjectId[]> {
  if (!mongoose.Types.ObjectId.isValid(orgId)) return [];
  const oid = new mongoose.Types.ObjectId(orgId);
  const ids = await Branch.find({ organization: oid }).distinct("_id");
  return ids as mongoose.Types.ObjectId[];
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
