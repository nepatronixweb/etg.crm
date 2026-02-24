import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const student = searchParams.get("student");
    const status = searchParams.get("status");
    const country = searchParams.get("country");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (student) filter.student = student;
    if (status) filter.status = status;
    if (country) filter.country = country;

    const applications = await Application.find(filter)
      .populate("student", "name email")
      .populate("submittedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(applications);
  } catch {
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const application = await Application.create({ ...body, submittedBy: session.user.id });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Applications",
      targetId: application._id.toString(),
      targetName: application.universityName,
      details: `Application created for ${application.country}`,
    });

    return NextResponse.json({ message: "Application created", application }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}
