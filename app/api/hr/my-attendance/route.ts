import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import "@/models/User";
import { getTodayYmd } from "@/lib/hr/dateAndIp";

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const from = searchParams.get("from") || addDaysYmd(to, -30);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "Invalid from/to (use YYYY-MM-DD)" }, { status: 400 });
    }

    await connectDB();
    const rows = await Attendance.find({
      userId: session.user.id,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({
      attendance: rows,
      serverToday: getTodayYmd(),
    });
  } catch (err) {
    console.error("GET /api/hr/my-attendance", err);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}
