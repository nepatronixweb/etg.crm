import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const student = await Student.findById(id)
      .populate("branch", "name location")
      .populate("counsellor", "name email")
      .populate("lead");
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    // Support raw MongoDB operators ($push, $pull, etc.) passed directly in the body
    const hasOperators = Object.keys(body).some((k) => k.startsWith("$"));
    const update = hasOperators ? body : { $set: body };
    const student = await Student.findByIdAndUpdate(id, update, { new: true, runValidators: false })
      .populate("branch", "name location")
      .populate("counsellor", "name email");
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student);
  } catch (err) {
    console.error("PATCH /api/students/[id] error:", err);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Check for visa approval → decrement counsellor target
    if (body.visaApproved) {
      await User.findByIdAndUpdate(student.counsellor, { $inc: { target: -1 } });
      await ActivityLog.create({
        user: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "VISA_APPROVED",
        module: "Students",
        targetId: id,
        targetName: student.name,
        details: `Visa approved for ${body.country}. Counsellor target decremented.`,
      });
    }

    const updated = await Student.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await connectDB();
    const student = await Student.findByIdAndDelete(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "DELETE",
      module: "Students",
      targetId: id,
      targetName: student.name,
      details: `Deleted student ${student.name}`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
