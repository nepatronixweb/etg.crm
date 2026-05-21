import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { getOrgUserIdsForSession } from "@/lib/tenantRecordAccess";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canView = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("activity_logs");
    if (!canView) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const moduleFilter = searchParams.get("module");
    const user = searchParams.get("user");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (moduleFilter) filter.module = moduleFilter;
    if (user) filter.user = user;

    if (session.user.role !== "super_admin") {
      const orgUserIds = await getOrgUserIdsForSession(session);
      if (orgUserIds && orgUserIds.length === 0) {
        return NextResponse.json({ logs: [], total: 0, pages: 0 });
      }
      if (orgUserIds) {
        if (user && !orgUserIds.some((id) => id.toString() === user)) {
          return NextResponse.json({ logs: [], total: 0, pages: 0 });
        }
        filter.user = user ? user : { $in: orgUserIds };
      }
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user", "name role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ActivityLog.countDocuments(filter),
    ]);

    return NextResponse.json({ logs, total, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
