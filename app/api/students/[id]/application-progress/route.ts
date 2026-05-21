import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { auth } from "@/lib/auth";
import { findStudentInTenant } from "@/lib/tenantRecordAccess";

async function loadStudentForProgress(session: NonNullable<Awaited<ReturnType<typeof auth>>>, id: string) {
  await connectDB();
  return findStudentInTenant(session, id);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { stage, remarks, standing, statusDate } = await req.json();
    if (!stage) return NextResponse.json({ error: "Stage is required" }, { status: 400 });

    const student = await loadStudentForProgress(session, id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const newEntry = {
      stage,
      remarks: remarks || "",
      standing: standing || "",
      statusDate: statusDate ? new Date(statusDate) : new Date(),
      changedBy: session.user.id,
      changedByName: session.user.name || session.user.email,
    };

    student.applicationProgressHistory = student.applicationProgressHistory || [];
    student.applicationProgressHistory.push(newEntry);
    await student.save();

    return NextResponse.json({ message: "Application progress recorded", entry: newEntry });
  } catch (error) {
    console.error("Error recording application progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const student = await loadStudentForProgress(session, id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({
      applicationProgressHistory: student.applicationProgressHistory || [],
    });
  } catch (error) {
    console.error("Error fetching application progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
