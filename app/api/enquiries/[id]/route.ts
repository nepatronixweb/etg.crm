import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { createNotifications, getSuperAdminIds } from "@/lib/notifications";
import { LEAD_PATCH_FD_STATUS_AND_STAGE_ROLES } from "@/lib/leadWorkflowStatusRoles";
import { getEnquiryForSessionAccess } from "@/lib/tenantRecordAccess";
import { jsonNoCache } from "@/lib/apiNoCache";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const access = await getEnquiryForSessionAccess(session, id);
    if (access === "not_found") return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const enquiry = await Enquiry.findById(id)
      .populate("branch", "name location")
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name");
    return jsonNoCache(enquiry);
  } catch {
    return NextResponse.json({ error: "Failed to fetch enquiry" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const access = await getEnquiryForSessionAccess(session, id);
    if (access === "not_found") return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existingAssigned = access.assignedTo?.toString();
    const body = await req.json();
    const setFields = { ...body };
    if (!setFields.assignedTo) delete setFields.assignedTo;
    if (!setFields.branch) delete setFields.branch;

    const enquiry = await Enquiry.findByIdAndUpdate(id, { $set: setFields }, { new: true, runValidators: false });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "UPDATE",
      module: "Enquiries",
      targetId: enquiry._id.toString(),
      targetName: enquiry.name,
      details: `Updated enquiry: ${JSON.stringify(body)}`,
    });

    const newAssignedTo = body.assignedTo?.toString();
    if (newAssignedTo && newAssignedTo !== existingAssigned) {
      const adminIds = await getSuperAdminIds();
      const recipientIds = [...new Set([newAssignedTo, ...adminIds])];
      await createNotifications({
        recipientIds,
        type: "lead_assigned",
        title: "Enquiry assigned",
        message: `${session.user.name} assigned enquiry "${enquiry.name}" to you`,
        link: `/enquiries/${enquiry._id}`,
        createdBy: session.user.id,
      });
    }

    return jsonNoCache(enquiry);
  } catch (error) {
    console.error("Update enquiry error:", error);
    const message = error instanceof Error ? error.message : "Failed to update enquiry";
    return NextResponse.json({ error: `Failed to update enquiry: ${message}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};

    const access = await getEnquiryForSessionAccess(session, id);
    if (access === "not_found") return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const preAssigned = access.assignedTo?.toString();

    const resolveStatusEnteredAt = (): Date | null => {
      if (typeof body.statusDate === "string" && body.statusDate.trim() !== "") {
        const d = new Date(body.statusDate.trim());
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    if (LEAD_PATCH_FD_STATUS_AND_STAGE_ROLES.has(session.user.role)) {
      if (body.status) {
        update.status = body.status;
        const entered = resolveStatusEnteredAt();
        if (entered === null && typeof body.statusDate === "string" && body.statusDate.trim() !== "") {
          return NextResponse.json({ error: "Invalid status date" }, { status: 400 });
        }
        update[`statusDates.${body.status}`] = entered ?? new Date();
      }
      if (body.stage) {
        update.stage = body.stage;
        update[`stageDates.${body.stage}`] = new Date();
      }
    } else {
      if (body.stage) {
        update.stage = body.stage;
        update[`stageDates.${body.stage}`] = new Date();
      }
      if (body.status) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const allowedFields = ["assignedTo", "assignedBy", "standing", "interestedCountry", "interestedService", "comments", "notes"];
    for (const field of allowedFields) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    const enquiry = await Enquiry.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    const newAssignedTo =
      body.assignedTo !== undefined && body.assignedTo !== null ? String(body.assignedTo) : undefined;
    if (newAssignedTo && newAssignedTo !== preAssigned) {
      const adminIds = await getSuperAdminIds();
      const recipientIds = [...new Set([newAssignedTo, ...adminIds])];
      await createNotifications({
        recipientIds,
        type: "lead_assigned",
        title: "Enquiry assigned",
        message: `${session.user.name} assigned enquiry "${enquiry.name}" to you`,
        link: `/enquiries/${enquiry._id}`,
        createdBy: session.user.id,
      });
    }

    return jsonNoCache(enquiry);
  } catch (error) {
    console.error("Patch enquiry error:", error);
    const message = error instanceof Error ? error.message : "Failed to update enquiry";
    return NextResponse.json({ error: `Failed to update enquiry: ${message}` }, { status: 500 });
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
    await Enquiry.findByIdAndDelete(id);
    return NextResponse.json({ message: "Enquiry deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete enquiry" }, { status: 404 });
  }
}
