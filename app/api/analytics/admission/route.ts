import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { auth } from "@/lib/auth";
import { getBranchIdsInOrganization } from "@/lib/orgUserScope";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canView = session.user.role === "super_admin"
      || ["admission_team"].includes(session.user.role)
      || (session.user.permissions ?? []).includes("analytics")
      || (session.user.permissions ?? []).includes("admissions");
    if (!canView) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const isSuperAdmin = session.user.role === "super_admin";
    const orgId = session.user.organizationId ?? undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let branchScope: Record<string, any> = {};
    if (!isSuperAdmin && orgId) {
      const branchIds = await getBranchIdsInOrganization(orgId);
      branchScope = branchIds.length === 0 ? { branch: { $in: [] } } : { branch: { $in: branchIds } };
    }

    const enrolledFilter = { enrolled: true, ...branchScope };

    const [
      enrolled,
      offerApplied,
      conditionalOffers,
      unconditionalOffers,
      gsApplied,
      gsApproved,
      coeApplied,
      coeReceived,
      recentRemarks,
    ] = await Promise.all([
      Student.countDocuments(enrolledFilter),
      Student.countDocuments({ ...enrolledFilter, stage: "offer_applied" }),
      Student.countDocuments({ ...enrolledFilter, stage: "conditional_offer_received" }),
      Student.countDocuments({ ...enrolledFilter, stage: "unconditional_offer_received" }),
      Student.countDocuments({ ...enrolledFilter, stage: "gs_applied" }),
      Student.countDocuments({ ...enrolledFilter, stage: "gs_approved" }),
      Student.countDocuments({ ...enrolledFilter, stage: "coe_applied" }),
      Student.countDocuments({ ...enrolledFilter, stage: "coe_received" }),
      Student.find({ ...enrolledFilter, "notes.0": { $exists: true } })
        .sort({ "notes.createdAt": -1 })
        .limit(8)
        .select("name notes")
        .lean(),
    ]);

    // Extract latest note per student
    const remarks = (recentRemarks as Array<{ _id: string; name: string; notes: Array<{ content: string; addedByName: string; createdAt: string }> }>)
      .map((s) => {
        const latest = s.notes[s.notes.length - 1];
        return latest ? { studentId: s._id, studentName: s.name, content: latest.content, addedBy: latest.addedByName, createdAt: latest.createdAt } : null;
      })
      .filter(Boolean)
      .slice(0, 6);

    return NextResponse.json({
      enrolled,
      offerApplied,
      conditionalOffers,
      unconditionalOffers,
      gsApplied,
      gsApproved,
      coeApplied,
      coeReceived,
      remarks,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch admission analytics" }, { status: 500 });
  }
}
