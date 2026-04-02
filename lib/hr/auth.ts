import type { Session } from "next-auth";

/** HR admin routes: super_admin or users explicitly marked hrRole admin (CRM `role` unchanged). */
export function isHrAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  if (session.user.role === "super_admin") return true;
  return session.user.hrRole === "admin";
}
