import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { createNotifications, getSuperAdminIds } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    // Role-based filtering
    if (session.user.role === "counsellor") filter.assignedTo = session.user.id;
    else if (session.user.role === "telecaller") filter.source = { $ne: "walk_in" };
    else if (session.user.role === "front_desk") {
      filter.branch = session.user.branch;
    } else if (session.user.role !== "super_admin") {
      filter.branch = session.user.branch;
    }

    if (branch) filter.branch = branch;
    if (standing) filter.standing = standing;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (country) filter.interestedCountry = country;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const leads = await Lead.find(filter)
      .populate("branch", "name")
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const { assignmentMethod, ...leadData } = body;

    // Auto-set branch from user's session if not provided or empty
    if (!leadData.branch && session.user.branch) {
      leadData.branch = session.user.branch;
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

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Leads",
      targetId: lead._id.toString(),
      targetName: lead.name,
      details: `Lead created from ${lead.source}`,
    });

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

    return NextResponse.json({ message: "Lead created", lead }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    const message = error instanceof Error ? error.message : "Failed to create lead";
    return NextResponse.json({ error: `Failed to create lead: ${message}` }, { status: 500 });
  }
}
