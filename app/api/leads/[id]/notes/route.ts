import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const { content } = await req.json();
    const lead = await Lead.findById(id);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    lead.notes.push({
      content,
      addedBy: session.user.id,
      addedByName: session.user.name,
      addedByRole: session.user.role as never,
      createdAt: new Date(),
    });
    await lead.save();

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "NOTE",
      module: "Leads",
      targetId: id,
      targetName: lead.name,
      details: `Added note: ${content.substring(0, 50)}...`,
    });

    return NextResponse.json({ message: "Note added", notes: lead.notes });
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
