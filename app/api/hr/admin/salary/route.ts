import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import { isHrAdmin } from "@/lib/hr/auth";
import { computeSalaryForMonth, monthToDateRange } from "@/lib/hr/salary";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isHrAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const now = new Date();
    const month =
      monthParam && /^\d{4}-\d{2}$/.test(monthParam.trim())
        ? monthParam.trim()
        : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const range = monthToDateRange(month);
    if (!range) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    await connectDB();
    const employees = await User.find({ isActive: true })
      .select("name email monthlySalary workingDays workingHoursPerDay officeNetworkIp")
      .sort({ name: 1 })
      .lean();

    const counts = await Attendance.aggregate<{ _id: string; c: number }>([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: "present",
        },
      },
      { $group: { _id: "$userId", c: { $sum: 1 } } },
    ]);
    const presentMap = new Map(counts.map((x) => [String(x._id), x.c]));

    const report = employees.map((u) => {
      const presentDays = presentMap.get(String(u._id)) ?? 0;
      const monthlySalary = u.monthlySalary ?? 0;
      const workingDays = u.workingDays ?? 26;
      const row = computeSalaryForMonth(monthlySalary, workingDays, presentDays, month);
      return {
        userId: String(u._id),
        name: u.name,
        email: u.email,
        workingHoursPerDay: (u as { workingHoursPerDay?: number }).workingHoursPerDay ?? 8,
        officeNetworkIp: String((u as { officeNetworkIp?: string }).officeNetworkIp ?? "").trim(),
        ...row,
      };
    });

    return NextResponse.json({ month, from: range.start, to: range.end, salaries: report });
  } catch (err) {
    console.error("GET /api/hr/admin/salary", err);
    return NextResponse.json({ error: "Failed to compute salary report" }, { status: 500 });
  }
}
