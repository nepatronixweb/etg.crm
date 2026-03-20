import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Student from "@/models/Student";
import User from "@/models/User";
import Application from "@/models/Application";
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
    const branch = searchParams.get("branch");
    const counsellor = searchParams.get("counsellor");
    const country = searchParams.get("country");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const source = searchParams.get("source");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter: Record<string, any> = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadFilter: Record<string, any> = { ...dateFilter };
    if (branch) leadFilter.branch = branch;
    if (source) leadFilter.source = source;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentFilter: Record<string, any> = { ...dateFilter };
    if (branch) studentFilter.branch = branch;
    if (counsellor) studentFilter.counsellor = counsellor;
    if (country) studentFilter["countries.country"] = country;

    const [
      totalLeads,
      totalStudents,
      totalApplications,
      convertedLeads,
      leadsBySource,
      leadsByStatus,
      studentsByStage,
      applicationsByStatus,
      applicationsByCountry,
      counsellorPerformance,
      recentLeads,
      recentActivity,
      conditionalOffers,
      unconditionalOffers,
      coeReceived,
      gsApplied,
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Student.countDocuments(studentFilter),
      Application.countDocuments(dateFilter),
      Lead.countDocuments({ ...leadFilter, convertedToStudent: true }),
      Lead.aggregate([{ $match: leadFilter }, { $group: { _id: "$source", count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: leadFilter }, { $group: { _id: "$standing", count: { $sum: 1 } } }]),
      Student.aggregate([{ $match: studentFilter }, { $group: { _id: "$currentStage", count: { $sum: 1 } } }]),
      Application.aggregate([{ $match: dateFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([{ $match: dateFilter }, { $group: { _id: "$country", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      User.find({ role: "counsellor", isActive: true }).select("name target currentCount branch").populate("branch", "name"),
      Lead.find(leadFilter).sort({ createdAt: -1 }).limit(5).populate("branch", "name").populate("assignedTo", "name"),
      ActivityLog.find(dateFilter).sort({ createdAt: -1 }).limit(10).populate("user", "name"),
      Student.countDocuments({ ...studentFilter, "countries.admissionStatus": "conditional" }),
      Student.countDocuments({ ...studentFilter, "countries.admissionStatus": "unconditional" }),
      Student.countDocuments({ ...studentFilter, "countries.applicationStatus": "coe_received" }),
      Student.countDocuments({ ...studentFilter, stage: "gs_applied" }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const stageMap = Object.fromEntries((studentsByStage as Array<{ _id: string; count: number }>).map((s) => [s._id, s.count]));

    return NextResponse.json({
      summary: {
        totalLeads, totalStudents, totalApplications, convertedLeads, conversionRate,
        conditionalOffers, unconditionalOffers, coeReceived,
        gsApplied,
        visaLodged: stageMap["visa"] ?? 0,
        granted: stageMap["completed"] ?? 0,
        rejected: stageMap["rejected"] ?? 0,
      },
      leadsBySource,
      leadsByStatus,
      studentsByStage,
      applicationsByStatus,
      applicationsByCountry,
      counsellorPerformance,
      recentLeads,
      recentActivity,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
