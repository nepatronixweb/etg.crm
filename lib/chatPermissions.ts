import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/utils";
import { isOrgWideAdmin } from "@/lib/roleGuards";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";

/** True if the signed-in user may use internal chat (all active team accounts; see hasPermission for "chat"). */
export function userHasChatAccess(session: Session | null): boolean {
  if (!session?.user) return false;
  return hasPermission(
    (session.user.permissions ?? []) as string[],
    "chat",
    session.user.role,
  );
}

/**
 * Full server-side chat gate: auth, role, subscription, org module toggle.
 * Returns a NextResponse to send, or null when access is allowed.
 */
export async function chatAccessDeniedResponse(
  session: Session | null
): Promise<NextResponse | null> {
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userHasChatAccess(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.user.orgAccessAllowed === false) {
    return NextResponse.json(
      { error: "Subscription required. Update billing to restore access." },
      { status: 402 }
    );
  }
  const role = session.user.role;
  if (isOrgWideAdmin(role)) return null;

  const settings = await getAppSettingsDocumentForSession(session);
  const enabled = settings.enabledModules ?? [];
  if (!enabled.includes("chat")) {
    return NextResponse.json({ error: "Chat module is disabled for your organization" }, { status: 403 });
  }
  return null;
}
