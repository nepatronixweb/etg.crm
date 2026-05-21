import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { auth } from "@/lib/auth";
import { findLeadInTenant, findStudentInTenant } from "@/lib/tenantRecordAccess";

export async function GET(_: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { leadId } = await params;
    await connectDB();

    if (session.user.role !== "super_admin") {
      const lead = await findLeadInTenant(session, leadId);
      if (!lead) return NextResponse.json(null);
    }

    const student = await Student.findOne({ lead: leadId })
      .populate("counsellor", "name email")
      .populate("branch", "name");

    if (!student) return NextResponse.json(null);

    if (session.user.role !== "super_admin") {
      const inTenant = await findStudentInTenant(session, String(student._id));
      if (!inTenant) return NextResponse.json(null);
    }

    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
