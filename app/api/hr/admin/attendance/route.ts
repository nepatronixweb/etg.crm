import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import { isHrAdmin } from "@/lib/hr/auth";
import { monthToDateRange } from "@/lib/hr/salary";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isHrAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const month = searchParams.get("month");
    const fromQ = searchParams.get("from");
    const toQ = searchParams.get("to");

    let from: string;
    let to: string;
    if (month) {
      const r = monthToDateRange(month);
      if (!r) return NextResponse.json({ error: "Invalid month (use YYYY-MM)" }, { status: 400 });
      from = r.start;
      to = r.end;
    } else if (fromQ && toQ) {
      from = fromQ;
      to = toQ;
    } else {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      const r = monthToDateRange(`${y}-${m}`);
      if (!r) return NextResponse.json({ error: "Invalid default month" }, { status: 500 });
      from = r.start;
      to = r.end;
    }

    await connectDB();
    const filter: Record<string, unknown> = {
      date: { $gte: from, $lte: to },
    };
    if (userId) filter.userId = userId;

    const rows = await Attendance.find(filter)
      .populate("userId", "name email role")
      .sort({ date: -1, checkIn: -1 })
      .lean();

    return NextResponse.json({ from, to, attendance: rows });
  } catch (err) {
    console.error("GET /api/hr/admin/attendance", err);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}
