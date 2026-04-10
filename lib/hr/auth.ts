import type { Session } from "next-auth";
import { hasPermission } from "@/lib/utils";

type HrAccessUser = {
  role: string;
  permissions?: string[];
  hrRole?: string;
} | null;

/** HR admin UI and /api/hr/admin/* — permission `hr`, legacy hrRole admin, or platform/org admin. */
export function canAccessHrManagement(user: HrAccessUser): boolean {
  if (!user) return false;
  const perms = (user.permissions ?? []) as string[];
  if (hasPermission(perms, "hr", user.role)) return true;
  return user.hrRole === "admin";
}

export function isHrAdmin(session: Session | null): boolean {
  return canAccessHrManagement(session?.user ?? null);
}
