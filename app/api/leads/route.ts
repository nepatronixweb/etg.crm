import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

/** Leads list must never be served from cache - bucket/status filters must apply per request. */
export const dynamic = "force-dynamic";
import Lead from "@/models/Lead";
import Enquiry from "@/models/Enquiry";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { hasModuleAction } from "@/lib/utils";
import { createNotifications, getSuperAdminIds } from "@/lib/notifications";
import { buildLeadListFilter, castObjectIdsForAggregateMatch } from "@/lib/buildLeadListFilter";
import { upsertEnquiryFromLead } from "@/lib/leadEnquirySync";

function normalizeLeadSource(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

type CaptureVisitEntry = {
  visitedAt: Date;
  visitPurpose?: string;
  capturedBy?: string;
};

function parseCaptureVisitEntry(raw: unknown, userId: string): CaptureVisitEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const atRaw = r.visitedAt;
  if (typeof atRaw !== "string" || !atRaw.trim()) return null;
  const visitedAt = new Date(atRaw.trim());
  if (Number.isNaN(visitedAt.getTime())) return null;
  const visitPurpose = typeof r.visitPurpose === "string" ? r.visitPurpose.trim() : "";
  return { visitedAt, visitPurpose, capturedBy: userId };
}

function parseCaptureVisitEntries(raw: unknown, userId: string): CaptureVisitEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => parseCaptureVisitEntry(r, userId)).filter((v): v is CaptureVisitEntry => v != null);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const { filter, searchTrimmed } = buildLeadListFilter(session, searchParams);

    const skip = (page - 1) * limit;
    const escapedForNameRank = searchTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const fetchPage = async () => {
      if (!searchTrimmed) {
        return Lead.find(filter)
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
      let aggLeads = await Lead.aggregate(pipeline);
      aggLeads = await Lead.populate(aggLeads, [
        { path: "branch", select: "name" },
        { path: "assignedTo", select: "name email" },
        { path: "assignedBy", select: "name" },
      ]);
      return aggLeads.map((doc: Record<string, unknown>) => {
        const { _nameSearchRank: _r, ...rest } = doc;
        return rest;
      });
    };

    const countFilter = searchTrimmed
      ? (castObjectIdsForAggregateMatch(filter) as Record<string, unknown>)
      : filter;
    const [leads, total] = await Promise.all([fetchPage(), Lead.countDocuments(countFilter)]);
    return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const perms = (session.user.permissions ?? []) as string[];
    if (!hasModuleAction(perms, session.user.role, "leads", "add")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { assignmentMethod, ...leadData } = body;
    const captureVisitEntry = parseCaptureVisitEntry(leadData.captureVisitEntry, session.user.id);
    const captureVisitEntries = parseCaptureVisitEntries(leadData.captureVisitEntries, session.user.id);
    const allCaptureVisits = [...captureVisitEntries, ...(captureVisitEntry ? [captureVisitEntry] : [])];
    delete leadData.captureVisitEntry;
    delete leadData.captureVisitEntries;

    leadData.name = typeof leadData.name === "string" ? leadData.name.trim() : "";
    leadData.phone = typeof leadData.phone === "string" ? leadData.phone.trim() : "";
    leadData.source = normalizeLeadSource(leadData.source);
    leadData.branch = typeof leadData.branch === "string" ? leadData.branch.trim() : leadData.branch;

    if (!leadData.name) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!leadData.phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!leadData.source) {
      return NextResponse.json({ error: "Lead source is required" }, { status: 400 });
    }

    // Auto-set branch from user's session if not provided or empty
    if (!leadData.branch && session.user.branch) {
      leadData.branch = session.user.branch;
    }
    if (!leadData.branch) {
      return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    }

    // Enforce role-based field restrictions
    if (session.user.role === "front_desk" && leadData.stage) {
      return NextResponse.json({ error: "Front desk users cannot set stage" }, { status: 403 });
    }
    if (session.user.role !== "front_desk" && leadData.status) {
      return NextResponse.json({ error: "Only front desk users can set status" }, { status: 403 });
    }

    // Set initial status for FD leads (only if not already provided)
    if (session.user.role === "front_desk" && !leadData.status) {
      leadData.status = "Open/Unassigned";
    }

    // Round Robin assignment
    if (assignmentMethod === "round_robin" && leadData.branch) {
      const counsellors = await User.find({ role: "counsellor", branch: leadData.branch, isActive: true });
      if (counsellors.length > 0) {
        const counts = await Lead.aggregate([
          { $match: { assignedTo: { $in: counsellors.map((c) => c._id) } } },
          { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
        const leastLoaded = counsellors.sort(
          (a, b) => (countMap.get(a._id.toString()) || 0) - (countMap.get(b._id.toString()) || 0)
        )[0];
        leadData.assignedTo = leastLoaded._id;
        leadData.assignedBy = session.user.id;
      }
    }

    const lead = await Lead.create(leadData);
    let persistedLead = lead;
    if (allCaptureVisits.length > 0) {
      const latestCaptureVisit = allCaptureVisits[allCaptureVisits.length - 1];
      const updated = await Lead.findByIdAndUpdate(
        lead._id,
        {
          $set: {
            visitCaptured: true,
            visitedAt: latestCaptureVisit.visitedAt,
            visitPurpose: latestCaptureVisit.visitPurpose ?? "",
          },
          $push: { captureVisits: { $each: allCaptureVisits } },
        },
        { new: true }
      );
      if (updated) persistedLead = updated;
    }

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Leads",
      targetId: lead._id.toString(),
      targetName: persistedLead.name,
      details: `Lead created from ${persistedLead.source}`,
    });

    try {
      await upsertEnquiryFromLead(persistedLead._id, persistedLead);
    } catch (syncErr) {
      console.error("Lead→Enquiry sync failed:", syncErr);
    }

    // Fire notifications when a counsellor is assigned
    if (leadData.assignedTo) {
      const assignedToId = leadData.assignedTo.toString();
      const adminIds = await getSuperAdminIds();
      const recipientIds = [...new Set([assignedToId, ...adminIds])];
      await createNotifications({
        recipientIds,
        type: "lead_assigned",
        title: "New Lead Assigned",
        message: `${session.user.name} assigned lead "${lead.name}" to a counsellor`,
        link: `/leads/${lead._id}`,
        createdBy: session.user.id,
      });
    }

    return NextResponse.json({ message: "Lead created", lead: persistedLead }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    const message = error instanceof Error ? error.message : "Failed to create lead";
    return NextResponse.json({ error: `Failed to create lead: ${message}` }, { status: 500 });
  }
}

// DELETE - bulk delete (super_admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No lead IDs provided" }, { status: 400 });
    }
    await connectDB();
    const objectIds = ids
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
    if (objectIds.length > 0) {
      await Enquiry.deleteMany({ linkedLeadId: { $in: objectIds } });
    }
    const result = await Lead.deleteMany({ _id: { $in: objectIds } });
    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "DELETE",
      module: "Leads",
      targetId: ids.join(","),
      targetName: `${result.deletedCount} leads`,
      details: `Bulk deleted ${result.deletedCount} leads`,
    });
    return NextResponse.json({ message: `${result.deletedCount} leads deleted` });
  } catch {
    return NextResponse.json({ error: "Failed to delete leads" }, { status: 500 });
  }
}
