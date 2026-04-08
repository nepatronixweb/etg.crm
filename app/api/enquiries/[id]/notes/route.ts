import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

function canAccessEnquiry(role: string, userId: string, assignedToId: string | undefined): boolean {
  if (role === "super_admin" || role === "telecaller") return true;
  if (role === "counsellor" && assignedToId === userId) return true;
  return false;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const enquiry = await Enquiry.findById(id).select("assignedTo name notes");
    if (!enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    const assignedToId = enquiry.assignedTo?.toString();
    if (!canAccessEnquiry(session.user.role, session.user.id, assignedToId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { content } = await req.json();
    enquiry.notes.push({
      content,
      addedBy: session.user.id,
      addedByName: session.user.name,
      addedByRole: session.user.role as never,
      createdAt: new Date(),
    });
    await enquiry.save();

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "NOTE",
      module: "Enquiries",
      targetId: id,
      targetName: enquiry.name,
      details: `Added note: ${content.substring(0, 50)}...`,
    });

    return NextResponse.json({ message: "Note added", notes: enquiry.notes });
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
