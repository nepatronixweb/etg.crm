import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import {
  DASHBOARD_WIDGET_DEFINITIONS,
  type DashboardAudience,
  DEFAULT_WIDGET_ORDER,
} from "@/lib/dashboardLayout";

export const dynamic = "force-dynamic";

const AUDIENCES = new Set<DashboardAudience>(Object.keys(DEFAULT_WIDGET_ORDER) as DashboardAudience[]);

function sanitizeOrderForAudience(audience: DashboardAudience, order: string[]): string[] {
  const allowed = new Set(
    DASHBOARD_WIDGET_DEFINITIONS.filter((w) => w.audience === audience).map((w) => w.id)
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) {
    const k = String(id).slice(0, 128);
    if (!allowed.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * PATCH — current user only. Persists `dashboardWidgetOrder[audience]` (merge with existing doc).
 * Body: { audience: DashboardAudience, order: string[] }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const audience = body?.audience as string | undefined;
    const order = body?.order;

    if (!audience || typeof audience !== "string" || !AUDIENCES.has(audience as DashboardAudience)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: "order must be a non-empty array" }, { status: 400 });
    }

    const aud = audience as DashboardAudience;
    const cleaned = sanitizeOrderForAudience(aud, order.map((x) => String(x)));
    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid widget ids" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).select("dashboardWidgetOrder").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const prev =
      user.dashboardWidgetOrder && typeof user.dashboardWidgetOrder === "object" && !Array.isArray(user.dashboardWidgetOrder)
        ? { ...(user.dashboardWidgetOrder as Record<string, string[]>) }
        : {};

    prev[aud] = cleaned;

    await User.findByIdAndUpdate(session.user.id, { $set: { dashboardWidgetOrder: prev } });

    return NextResponse.json({ ok: true, dashboardWidgetOrder: prev });
  } catch (e) {
    console.error("PATCH /api/users/me/dashboard-layout", e);
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
  }
}
