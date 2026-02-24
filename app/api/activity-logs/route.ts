import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
