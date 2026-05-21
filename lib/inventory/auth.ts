import type { Session } from "next-auth";
import { hasPermission } from "@/lib/utils";

/** Inventory admin: create/assign assets, manage stock (matches UI hasPermission rules). */
export function canManageInventory(session: Session | null): boolean {
  if (!session?.user) return false;
  return hasPermission(session.user.permissions ?? [], "inventory", session.user.role);
}
