import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

/** Enquiries list must never be served from cache - bucket filters apply per request. */
export const dynamic = "force-dynamic";
import Enquiry from "@/models/Enquiry";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { hasModuleAction } from "@/lib/utils";
import { createNotifications, getSuperAdminIds } from "@/lib/notifications";
import { mergeTelecallerFreshLeadFilter, TELECALLER_FRESH_BUCKET } from "@/lib/telecallerFreshLeads";
import {
  isTelecallerOverviewDashboardBucket,
  mergeTelecallerOverviewBucketFilter,
} from "@/lib/telecallerLeadOverviewBuckets";
import { parseCreatedAtDateOnlyBound } from "@/lib/dateTimeRangeFilterDefaults";

function parseEnquiryCreatedAtBound(raw: string, bound: "from" | "to"): Date {
  const s = raw.trim();
  if (!s) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return parseCreatedAtDateOnlyBound(s, bound);
  }
  return new Date(s);
}

const ENQUIRY_MATCH_OBJECT_ID_KEYS = new Set(["branch", "assignedTo", "assignedBy"]);

function castObjectIdsForAggregateMatch(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (ENQUIRY_MATCH_OBJECT_ID_KEYS.has(key) && typeof val === "string" && mongoose.Types.ObjectId.isValid(val)) {
      out[key] = new mongoose.Types.ObjectId(val);
    } else if ((key === "$and" || key === "$or") && Array.isArray(val)) {
      out[key] = val.map((item) =>
        item && typeof item === "object" && !Array.isArray(item) && !(item instanceof Date)
          ? castObjectIdsForAggregateMatch(item as Record<string, unknown>)
          : item
      );
    } else {
      out[key] = val;
    }
  }
  return out;
}

function canUseEnquiriesApi(role: string): boolean {
  return role === "telecaller" || role === "super_admin";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canUseEnquiriesApi(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const standing = searchParams.get("standing");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const country = searchParams.get("country");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const service = searchParams.get("service");
    const stage = searchParams.get("stage");
    const academicYear = searchParams.get("academicYear");
    const applyLevel = searchParams.get("applyLevel");
    const fdStatus = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (session.user.role === "telecaller") filter.source = { $ne: "walk_in" };
    // super_admin: no extra row-level filter

    if (branch) filter.branch = branch;
    if (standing) filter.standing = standing;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (country) filter.interestedCountry = country;
    if (status) filter.status = status;
    if (from || to) {
      const createdRange: { $gte?: Date; $lte?: Date } = {};
      if (from) {
        const d = parseEnquiryCreatedAtBound(from, "from");
        if (!Number.isNaN(d.getTime())) createdRange.$gte = d;
      }
      if (to) {
        const d = parseEnquiryCreatedAtBound(to, "to");
        if (!Number.isNaN(d.getTime())) createdRange.$lte = d;
      }
      if (Object.keys(createdRange).length > 0) filter.createdAt = createdRange;
    }
    if (service) filter.interestedService = service;
    if (stage) filter.stage = stage;
    if (academicYear) filter.academicYear = academicYear;
    if (applyLevel) filter.applyLevel = applyLevel;
    if (fdStatus) filter.status = fdStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let searchOrClause: any[] | undefined;
    const bucketParamRaw = searchParams.get("bucket");
    const bucketParam = bucketParamRaw?.trim() || null;
    const searchTrimmed = (search ?? "").trim();
    if (searchTrimmed) {
      const escaped = searchTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = { $regex: escaped, $options: "i" };
      searchOrClause = [
        { name: rx },
        { phone: rx },
        { email: rx },
        { interestedCountry: rx },
        { course: rx },
        { comments: rx },
        { parentName: rx },
        { senderName: rx },
        { academicInstitution: rx },
        {
          interestedCountries: {
            $elemMatch: {
              $or: [{ country: rx }, { universityName: rx }],
            },
          },
        },
      ];
      const bucketNeedsAndSearch =
        bucketParam === TELECALLER_FRESH_BUCKET || isTelecallerOverviewDashboardBucket(bucketParam);
      if (!bucketNeedsAndSearch) {
        filter.$or = searchOrClause;
      }
    }

    if (bucketParam === TELECALLER_FRESH_BUCKET) {
      mergeTelecallerFreshLeadFilter(filter, searchOrClause);
    } else if (bucketParam && isTelecallerOverviewDashboardBucket(bucketParam)) {
      mergeTelecallerOverviewBucketFilter(filter, bucketParam, searchOrClause);
    }

    const skip = (page - 1) * limit;
    const escapedForNameRank = searchTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const fetchPage = async () => {
      if (!searchTrimmed) {
        return Enquiry.find(filter)
          .populate("branch", "name")
          .populate("assignedTo", "name email")
          .populate("assignedBy", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      }
      const matchFilter = castObjectIdsForAggregateMatch(filter) as Record<string, unknown>;
      const pipeline: mongoose.PipelineStage[] = [
        { $match: matchFilter },
        {
          $addFields: {
            _nameSearchRank: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $toString: { $ifNull: ["$name", ""] } },
                    regex: escapedForNameRank,
                    options: "i",
                  },
                },
                1,
                0,
              ],
            },
          },
        },
        { $sort: { _nameSearchRank: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];
      let agg = await Enquiry.aggregate(pipeline);
      agg = await Enquiry.populate(agg, [
        { path: "branch", select: "name" },
        { path: "assignedTo", select: "name email" },
        { path: "assignedBy", select: "name" },
      ]);
      return agg.map((doc: Record<string, unknown>) => {
        const { _nameSearchRank: _r, ...rest } = doc;
        return rest;
      });
    };

    const countFilter = searchTrimmed
      ? (castObjectIdsForAggregateMatch(filter) as Record<string, unknown>)
      : filter;
    const [leads, total] = await Promise.all([fetchPage(), Enquiry.countDocuments(countFilter)]);
    return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch enquiries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canUseEnquiriesApi(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const perms = (session.user.permissions ?? []) as string[];
    if (!hasModuleAction(perms, session.user.role, "leads", "add")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { assignmentMethod, ...enquiryData } = body;

    if (!enquiryData.branch && session.user.branch) {
      enquiryData.branch = session.user.branch;
    }

    if (assignmentMethod === "round_robin" && enquiryData.branch) {
      const counsellors = await User.find({ role: "counsellor", branch: enquiryData.branch, isActive: true });
      if (counsellors.length > 0) {
        const counts = await Enquiry.aggregate([
          { $match: { assignedTo: { $in: counsellors.map((c) => c._id) } } },
          { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
        const leastLoaded = counsellors.sort(
          (a, b) => (countMap.get(a._id.toString()) || 0) - (countMap.get(b._id.toString()) || 0)
        )[0];
        enquiryData.assignedTo = leastLoaded._id;
        enquiryData.assignedBy = session.user.id;
      }
    }

    const enquiry = await Enquiry.create(enquiryData);

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Enquiries",
      targetId: enquiry._id.toString(),
      targetName: enquiry.name,
      details: `Enquiry created from ${enquiry.source}`,
    });

    if (enquiryData.assignedTo) {
      const assignedToId = enquiryData.assignedTo.toString();
      const adminIds = await getSuperAdminIds();
      const recipientIds = [...new Set([assignedToId, ...adminIds])];
      await createNotifications({
        recipientIds,
        type: "lead_assigned",
        title: "New enquiry assigned",
        message: `${session.user.name} assigned enquiry "${enquiry.name}" to a counsellor`,
        link: `/enquiries/${enquiry._id}`,
        createdBy: session.user.id,
      });
    }

    return NextResponse.json({ message: "Enquiry created", lead: enquiry }, { status: 201 });
  } catch (error) {
    console.error("Create enquiry error:", error);
    const message = error instanceof Error ? error.message : "Failed to create enquiry";
    return NextResponse.json({ error: `Failed to create enquiry: ${message}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No enquiry IDs provided" }, { status: 400 });
    }
    await connectDB();
    const result = await Enquiry.deleteMany({ _id: { $in: ids } });
    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "DELETE",
      module: "Enquiries",
      targetId: ids.join(","),
      targetName: `${result.deletedCount} enquiries`,
      details: `Bulk deleted ${result.deletedCount} enquiries`,
    });
    return NextResponse.json({ message: `${result.deletedCount} enquiries deleted` });
  } catch {
    return NextResponse.json({ error: "Failed to delete enquiries" }, { status: 500 });
  }
}
