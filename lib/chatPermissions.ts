import type { Session } from "next-auth";
import { hasPermission } from "@/lib/utils";

/** True if the session allows internal chat (module permission + role rules in hasPermission). */
export function userHasChatAccess(session: Session | null): boolean {
  if (!session?.user) return false;
  return hasPermission(
    (session.user.permissions ?? []) as string[],
    "chat",
    session.user.role,
  );
}
