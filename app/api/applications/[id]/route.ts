import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const app = await Application.findById(id).populate("student", "name email").populate("submittedBy", "name");
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    if (body.status === "submitted") body.submittedAt = new Date();

    const app = await Application.findByIdAndUpdate(id, body, { new: true });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "UPDATE",
      module: "Applications",
      targetId: id,
      targetName: app?.universityName,
      details: `Status updated to ${body.status}`,
    });

    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
