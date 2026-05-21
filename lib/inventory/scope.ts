import mongoose from "mongoose";
import type { Session } from "next-auth";
import { isBranchInOrganization, TENANT_SCOPE_EMPTY_MATCH } from "@/lib/orgUserScope";
import { tenantOrganizationScopeForSession } from "@/lib/tenantRecordAccess";

export type InventoryScopeOptions = {
  branchId?: string | null;
  search?: string | null;
  category?: string | null;
  status?: string | null;
};

export async function inventoryOrgScope(session: Session): Promise<Record<string, unknown>> {
  return session.user.role === "super_admin" ? {} : tenantOrganizationScopeForSession(session);
}

export async function inventoryQueryScope(
  session: Session,
  options?: InventoryScopeOptions
): Promise<Record<string, unknown>> {
  const orgScope = await inventoryOrgScope(session);
  const parts: Record<string, unknown>[] = [orgScope];

  const branchId = options?.branchId?.trim();
  if (branchId) {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { ...TENANT_SCOPE_EMPTY_MATCH };
    }
    if (session.user.role !== "super_admin" && session.user.organizationId) {
      const ok = await isBranchInOrganization(branchId, session.user.organizationId);
      if (!ok) return { ...TENANT_SCOPE_EMPTY_MATCH };
    }
    parts.push({ branch: new mongoose.Types.ObjectId(branchId) });
  }

  const search = options?.search?.trim();
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    parts.push({
      $or: [{ name: re }, { assetTag: re }, { serialNumber: re }],
    });
  }

  const category = options?.category?.trim();
  if (category && category !== "all") {
    parts.push({ category });
  }

  const status = options?.status?.trim();
  if (status === "active") {
    parts.push({ status: { $ne: "retired" } });
  } else if (status && status !== "all") {
    parts.push({ status });
  }

  if (parts.length === 1) return parts[0]!;
  return { $and: parts };
}

export async function inventoryStockQueryScope(
  session: Session,
  options?: InventoryScopeOptions
): Promise<Record<string, unknown>> {
  const orgScope = await inventoryOrgScope(session);
  const parts: Record<string, unknown>[] = [orgScope];

  const branchId = options?.branchId?.trim();
  if (branchId) {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return { ...TENANT_SCOPE_EMPTY_MATCH };
    }
    if (session.user.role !== "super_admin" && session.user.organizationId) {
      const ok = await isBranchInOrganization(branchId, session.user.organizationId);
      if (!ok) return { ...TENANT_SCOPE_EMPTY_MATCH };
    }
    parts.push({ branch: new mongoose.Types.ObjectId(branchId) });
  }

  const search = options?.search?.trim();
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    parts.push({ $or: [{ name: re }, { sku: re }] });
  }

  const category = options?.category?.trim();
  if (category && category !== "all") {
    parts.push({ category });
  }

  if (parts.length === 1) return parts[0]!;
  return { $and: parts };
}

export async function assertBranchInSessionOrg(
  session: Session,
  branchId: string | null | undefined
): Promise<boolean> {
  if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) return true;
  if (session.user.role === "super_admin") return true;
  if (!session.user.organizationId) return false;
  return isBranchInOrganization(branchId, session.user.organizationId);
}
