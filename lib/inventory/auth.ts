import type { Session } from "next-auth";

/** Inventory admin: create/assign assets, manage stock (super_admin always). */
export function canManageInventory(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "super_admin") return true;
  return (session.user.permissions ?? []).includes("inventory");
}
