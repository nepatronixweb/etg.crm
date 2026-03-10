import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { createNotifications, getSuperAdminIds } from "@/lib/notifications";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const lead = await Lead.findById(id)
      .populate("branch", "name location")
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name");
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    // Snapshot old assignedTo before updating
    const oldLead = await Lead.findById(id).select("assignedTo name").lean();
    const oldAssignedTo = oldLead?.assignedTo?.toString();

    const lead = await Lead.findByIdAndUpdate(id, body, { new: true });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "UPDATE",
      module: "Leads",
      targetId: lead._id.toString(),
      targetName: lead.name,
      details: `Updated lead: ${JSON.stringify(body)}`,
    });

    // Fire notification if counsellor assignment changed
    const newAssignedTo = body.assignedTo?.toString();
    if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
      const adminIds = await getSuperAdminIds();
      const recipientIds = [...new Set([newAssignedTo, ...adminIds])];
      await createNotifications({
        recipientIds,
        type: "lead_assigned",
        title: "Lead Assigned",
        message: `${session.user.name} assigned lead "${lead.name}" to you`,
        link: `/leads/${lead._id}`,
        createdBy: session.user.id,
      });
    }

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    // Auto-record date when a stage is set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { ...body };
    if (body.stage) {
      update[`stageDates.${body.stage}`] = new Date();
    }
    const lead = await Lead.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    await Lead.findByIdAndDelete(id);
    return NextResponse.json({ message: "Lead deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
