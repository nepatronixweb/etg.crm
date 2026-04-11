import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Branch from "@/models/Branch";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Student from "@/models/Student";
import Enquiry from "@/models/Enquiry";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { isBranchInOrganization } from "@/lib/orgUserScope";

function canManageBranches(session: { user: { role: string; permissions?: string[] } }): boolean {
  return session.user.role === "super_admin" || (session.user.permissions ?? []).includes("branches");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !canManageBranches(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const branch = await Branch.findById(id).lean();
    if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

    if (session.user.role !== "super_admin") {
      const orgId = session.user.organizationId;
      if (!orgId || !(await isBranchInOrganization(id, orgId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const branchOid = new mongoose.Types.ObjectId(id);
    const [userCount, leadCount, studentCount, enquiryCount] = await Promise.all([
      User.countDocuments({ branch: branchOid }),
      Lead.countDocuments({ branch: branchOid }),
      Student.countDocuments({ branch: branchOid }),
      Enquiry.countDocuments({ branch: branchOid }),
    ]);
    if (userCount + leadCount + studentCount + enquiryCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this branch while users or CRM records are still linked. Reassign or remove them first.",
          counts: { userCount, leadCount, studentCount, enquiryCount },
        },
        { status: 400 }
      );
    }

    await Branch.findByIdAndDelete(id);

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "DELETE",
      module: "Branches",
      targetId: id,
      targetName: branch.name,
      details: `Deleted branch at ${branch.location}`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}
