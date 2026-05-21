import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { findStudentInTenant } from "@/lib/tenantRecordAccess";

async function loadStudent(session: NonNullable<Awaited<ReturnType<typeof auth>>>, id: string) {
  await connectDB();
  return findStudentInTenant(session, id);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { country, stage, remarks, standing, statusDate } = await req.json();
    if (!country || !stage) {
      return NextResponse.json({ error: "Country and stage are required" }, { status: 400 });
    }

    const student = await loadStudent(session, id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const newEntry = {
      country,
      stage,
      remarks: remarks || "",
      standing: standing || "",
      statusDate: statusDate ? new Date(statusDate) : new Date(),
      changedBy: session.user.id,
      changedByName: session.user.name || session.user.email,
    };

    student.visaProgressHistory = student.visaProgressHistory || [];
    student.visaProgressHistory.push(newEntry);
    await student.save();

    return NextResponse.json({ message: "Visa progress recorded", entry: newEntry });
  } catch (error) {
    console.error("Error recording visa progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const student = await loadStudent(session, id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    return NextResponse.json({
      visaProgressHistory: student.visaProgressHistory || [],
    });
  } catch (error) {
    console.error("Error fetching visa progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
