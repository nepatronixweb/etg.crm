import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { getEnquiryForSessionAccess } from "@/lib/tenantRecordAccess";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const access = await getEnquiryForSessionAccess(session, id);
    if (access === "not_found") return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    if (access === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json();
    access.notes.push({
      content,
      addedBy: session.user.id,
      addedByName: session.user.name,
      addedByRole: session.user.role as never,
      createdAt: new Date(),
    });
    await access.save();

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "NOTE",
      module: "Enquiries",
      targetId: id,
      targetName: access.name,
      details: `Added note: ${content.substring(0, 50)}...`,
    });

    return NextResponse.json({ message: "Note added", notes: access.notes });
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
