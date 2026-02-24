import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Branch from "@/models/Branch";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const branches = await Branch.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await req.json();
    const branch = await Branch.create(body);

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Branches",
      targetId: branch._id.toString(),
      targetName: branch.name,
      details: `Created branch at ${branch.location}`,
    });

    return NextResponse.json({ message: "Branch created", branch }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}
