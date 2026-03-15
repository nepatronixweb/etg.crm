import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import Lead from "@/models/Lead";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");
    const stage = searchParams.get("stage");
    const counsellor = searchParams.get("counsellor");
    const country = searchParams.get("country");
    const leadId = searchParams.get("leadId");
    const standing = searchParams.get("standing");
    const enrolled = searchParams.get("enrolled");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (session.user.role === "counsellor") filter.counsellor = session.user.id;
    else if (session.user.role !== "super_admin") filter.branch = session.user.branch;

    if (branch) filter.branch = branch;
    if (stage) filter.currentStage = stage;
    if (counsellor) filter.counsellor = counsellor;
    if (country) filter["countries.country"] = country;
    if (leadId) { filter.lead = leadId; delete filter.branch; delete filter.counsellor; }
    if (standing) filter.standing = standing;
    if (enrolled === "true") filter.enrolled = true;

    const students = await Student.find(filter)
      .populate("branch", "name")
      .populate("counsellor", "name email")
      .populate("lead", "source")
      .sort({ createdAt: -1 });

    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();

    // ── Mode 1: Direct creation (full form) ──────────────────────────────────
    if (body.direct) {
      const {
        name, phone, email, dateOfBirth, source,
        interestedService, interestedCountry,
        branch, counsellorId, comments,
      } = body;

      // Create lead first
      const lead = await Lead.create({
        name, phone, email, dateOfBirth, source,
        interestedService, interestedCountry,
        branch: branch || session.user.branch,
        status: "warm",
        assignedTo: counsellorId || undefined,
        assignedBy: counsellorId ? session.user.id : undefined,
        notes: comments ? [{ content: comments, addedBy: session.user.id, addedByName: session.user.name, addedByRole: session.user.role }] : [],
        convertedToStudent: true,
      });

      const counsellor = counsellorId || session.user.id;

      const student = await Student.create({
        lead: lead._id,
        name, phone, email, dateOfBirth, source,
        branch: branch || session.user.branch,
        counsellor,
        currentStage: "counsellor",
        countries: [{ country: interestedCountry, status: "counsellor" }],
      });

      await User.findByIdAndUpdate(counsellor, { $inc: { currentCount: 1 } });

      await ActivityLog.create({
        user: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: "CREATE",
        module: "Students",
        targetId: student._id.toString(),
        targetName: student.name,
        details: `Student added directly for ${interestedCountry}`,
      });

      return NextResponse.json({ message: "Student created", student }, { status: 201 });
    }

    // ── Mode 2: Convert existing lead ────────────────────────────────────────
    const { leadId, country, countries: countriesInput } = body;

    const lead = await Lead.findById(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.convertedToStudent) return NextResponse.json({ error: "Lead already converted" }, { status: 400 });

    const counsellor = lead.assignedTo || session.user.id;

    // Support both legacy single-country and new multi-country format
    const countriesArray: { country: string; universityName?: string; status: string }[] =
      Array.isArray(countriesInput) && countriesInput.length > 0
        ? countriesInput.map((c: { country: string; universityName?: string }) => ({
            country: c.country,
            universityName: c.universityName || "",
            status: "counsellor",
          }))
        : [{ country: country || lead.interestedCountry, status: "counsellor" }];

    const student = await Student.create({
      lead: leadId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      dateOfBirth: lead.dateOfBirth,
      source: lead.source,
      branch: lead.branch,
      counsellor,
      currentStage: "counsellor",
      countries: countriesArray,
    });

    lead.convertedToStudent = true;
    await lead.save();

    await User.findByIdAndUpdate(counsellor, { $inc: { currentCount: 1 } });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CONVERT",
      module: "Students",
      targetId: student._id.toString(),
      targetName: student.name,
      details: `Lead converted to student for ${country || lead.interestedCountry}`,
    });

    return NextResponse.json({ message: "Student created", student }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    await Student.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ message: `Deleted ${ids.length} students` });
  } catch {
    return NextResponse.json({ error: "Failed to delete students" }, { status: 500 });
  }
}
