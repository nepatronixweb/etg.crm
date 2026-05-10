import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Student from "@/models/Student";
import User from "@/models/User";
import Application from "@/models/Application";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { getBranchIdsInOrganization } from "@/lib/orgUserScope";
import { normalizeMatchIdsForAggregate } from "@/lib/mongoAggregateMatch";

/** Merge aggregate buckets (e.g. Application + Student countries) by string key */
function mergeCountBuckets(
  parts: Array<Array<{ _id: unknown; count: number }>>
): Array<{ _id: string; count: number }> {
  const map = new Map<string, number>();
  for (const arr of parts) {
    for (const row of arr) {
      const key =
        row._id === null || row._id === undefined || row._id === ""
          ? "Not recorded"
          : String(row._id);
      map.set(key, (map.get(key) ?? 0) + row.count);
    }
  }
  return Array.from(map.entries())
    .map(([_id, count]) => ({ _id, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canView = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("analytics");
    if (!canView) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const counselledAtBounds: Record<string, unknown> = { $ne: null };
    if (from) counselledAtBounds.$gte = new Date(from);
    if (to) counselledAtBounds.$lte = new Date(to);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentFilter: Record<string, any> = { ...dateFilter };
    if (branch) studentFilter.branch = branch;
    if (counsellor) studentFilter.counsellor = counsellor;
    if (country) studentFilter["countries.country"] = country;

    const isSuperAdmin = session.user.role === "super_admin";
    const orgId = session.user.organizationId ?? undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applicationFilter: Record<string, any> = { ...dateFilter };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activityLogFilter: Record<string, any> = { ...dateFilter };
    let counsellorQuery: Record<string, unknown> = { role: "counsellor", isActive: true };

    if (!isSuperAdmin && orgId) {
      const tenantBranchIds = await getBranchIdsInOrganization(orgId);
      const noBranches = tenantBranchIds.length === 0;

      if (branch) {
        const allowed = tenantBranchIds.some((id) => id.toString() === branch);
        if (allowed) {
          leadFilter.branch = branch;
          studentFilter.branch = branch;
        } else {
          leadFilter.branch = { $in: [] };
          studentFilter.branch = { $in: [] };
        }
      } else if (noBranches) {
        leadFilter.branch = { $in: [] };
        studentFilter.branch = { $in: [] };
      } else {
        leadFilter.branch = { $in: tenantBranchIds };
        studentFilter.branch = { $in: tenantBranchIds };
      }

      const lb = leadFilter.branch;
      if (typeof lb === "string") {
        const ids = await Student.find({ branch: lb }).distinct("_id");
        applicationFilter.student = { $in: ids };
      } else if (lb && typeof lb === "object" && Array.isArray((lb as { $in?: unknown }).$in)) {
        const arr = (lb as { $in: mongoose.Types.ObjectId[] }).$in;
        if (arr.length === 0) {
          applicationFilter.student = { $in: [] };
        } else {
          const ids = await Student.find({ branch: { $in: arr } }).distinct("_id");
          applicationFilter.student = { $in: ids };
        }
      }

      counsellorQuery = {
        ...counsellorQuery,
        branch: noBranches ? { $in: [] } : { $in: tenantBranchIds },
      };

      const orgUserIds = await User.find({
        branch: noBranches ? { $in: [] } : { $in: tenantBranchIds },
      }).distinct("_id");
      activityLogFilter = { ...activityLogFilter, user: { $in: orgUserIds } };
    }

    const structuralLeadFilter = { ...leadFilter };
    delete structuralLeadFilter.createdAt;

    const aggLeadMatch = normalizeMatchIdsForAggregate({ ...leadFilter });
    const aggStudentMatch = normalizeMatchIdsForAggregate({ ...studentFilter });
    const aggApplicationMatch = normalizeMatchIdsForAggregate({ ...applicationFilter });
    const aggStructuralLeadMatch = normalizeMatchIdsForAggregate({ ...structuralLeadFilter });

    const [
      totalLeads,
      totalStudents,
      totalApplications,
      convertedLeads,
      leadsBySource,
      leadsByStatus,
      studentsByStage,
      applicationsByStatusFromApps,
      applicationsByCountryFromApps,
      applicationsByCountryFromStudents,
      applicationsByStatusFromStudents,
      counsellorPerformance,
      recentLeads,
      recentActivity,
      conditionalOffers,
      unconditionalOffers,
      coeReceived,
      gsApplied,
      leadsCounselledAgg,
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Student.countDocuments(studentFilter),
      Application.countDocuments(applicationFilter),
      Lead.countDocuments({ ...leadFilter, convertedToStudent: true }),
      Lead.aggregate([{ $match: aggLeadMatch }, { $group: { _id: "$source", count: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: aggLeadMatch }, { $group: { _id: "$standing", count: { $sum: 1 } } }]),
      Student.aggregate([{ $match: aggStudentMatch }, { $group: { _id: "$currentStage", count: { $sum: 1 } } }]),
      Application.aggregate([{ $match: aggApplicationMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([{ $match: aggApplicationMatch }, { $group: { _id: "$country", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      /* Per-country rows on students (where most CRM application data lives) */
      Student.aggregate([
        { $match: aggStudentMatch },
        { $unwind: "$countries" },
        { $group: { _id: "$countries.country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      /* Prefer applicationStatus when set; else pipeline status on the country row */
      Student.aggregate([
        { $match: aggStudentMatch },
        { $unwind: "$countries" },
        {
          $addFields: {
            _statusLabel: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gt: [{ $strLenCP: { $toString: { $ifNull: ["$countries.applicationStatus", ""] } } }, 0],
                    },
                    then: { $toString: "$countries.applicationStatus" },
                  },
                ],
                default: { $toString: { $ifNull: ["$countries.status", "Not recorded"] } },
              },
            },
          },
        },
        { $group: { _id: "$_statusLabel", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.find(counsellorQuery).select("name target currentCount branch").populate("branch", "name"),
      Lead.find(leadFilter).sort({ createdAt: -1 }).limit(5).populate("branch", "name").populate("assignedTo", "name"),
      ActivityLog.find(activityLogFilter).sort({ createdAt: -1 }).limit(10).populate("user", "name"),
      Student.countDocuments({ ...studentFilter, "countries.admissionStatus": "conditional" }),
      Student.countDocuments({ ...studentFilter, "countries.admissionStatus": "unconditional" }),
      Student.countDocuments({ ...studentFilter, "countries.applicationStatus": "coe_received" }),
      Student.countDocuments({ ...studentFilter, stage: "gs_applied" }),
      Lead.aggregate<{ n: number }>([
        { $match: aggStructuralLeadMatch },
        {
          $addFields: {
            _sd: { $ifNull: ["$statusDates", {}] },
            counselledAt: {
              $ifNull: [
                { $getField: { field: "Counselled", input: "$_sd" } },
                { $getField: { field: "Phone Counselling", input: "$_sd" } },
              ],
            },
          },
        },
        { $match: { counselledAt: counselledAtBounds } },
        { $count: "n" },
      ]),
    ]);

    const leadsCounselled = (leadsCounselledAgg[0] as { n?: number } | undefined)?.n ?? 0;

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const stageMap = Object.fromEntries((studentsByStage as Array<{ _id: string; count: number }>).map((s) => [s._id, s.count]));

    /* Standalone Application docs + student country rows (real CRM data) */
    const applicationsByStatus = mergeCountBuckets([
      applicationsByStatusFromApps as Array<{ _id: unknown; count: number }>,
      applicationsByStatusFromStudents as Array<{ _id: unknown; count: number }>,
    ]);
    const applicationsByCountry = mergeCountBuckets([
      applicationsByCountryFromApps as Array<{ _id: unknown; count: number }>,
      applicationsByCountryFromStudents as Array<{ _id: unknown; count: number }>,
    ]);

    return NextResponse.json({
      summary: {
        totalLeads, totalStudents, totalApplications, convertedLeads, conversionRate,
        leadsCounselled,
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
