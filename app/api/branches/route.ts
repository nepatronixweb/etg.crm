import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Organization from "@/models/Organization";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import { createTrialOrganization } from "@/lib/ensureBranchOrganization";
import { assertOrgPlanLimit } from "@/lib/orgPlanUsage";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const filter: Record<string, unknown> = { isActive: true };
    if (session.user.role !== "super_admin") {
      if (!session.user.organizationId) {
        return NextResponse.json([]);
      }
      filter.organization = session.user.organizationId;
    }
    const branches = await Branch.find(filter).sort({ name: 1 });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canManage = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("branches");
    if (!canManage) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = (await req.json()) as {
      name?: string;
      location?: string;
      phone?: string;
      email?: string;
      organizationId?: string;
      createNewOrganization?: boolean;
      newOrganizationName?: string;
    };

    const { organizationId, createNewOrganization, newOrganizationName, ...branchFields } = body;
    if (!branchFields.name?.trim() || !branchFields.location?.trim()) {
      return NextResponse.json({ error: "Name and location are required" }, { status: 400 });
    }

    let orgId: mongoose.Types.ObjectId | null = null;

    if (session.user.role === "super_admin") {
      if (createNewOrganization) {
        const org = await createTrialOrganization(
          newOrganizationName?.trim() || branchFields.name.trim()
        );
        orgId = org._id as mongoose.Types.ObjectId;
      } else if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
        const org = await Organization.findById(organizationId);
        if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 400 });
        orgId = org._id as mongoose.Types.ObjectId;
      } else {
        return NextResponse.json(
          {
            error:
              "Super admin must pass organizationId (existing org) or createNewOrganization: true for a new 15-day trial org.",
          },
          { status: 400 }
        );
      }
    } else {
      const sid = session.user.organizationId;
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) {
        return NextResponse.json(
          { error: "Your account is not linked to an organization. Contact support." },
          { status: 400 }
        );
      }
      orgId = new mongoose.Types.ObjectId(sid);
    }

    const limitCheck = await assertOrgPlanLimit(orgId.toString(), "branches");
    if (!limitCheck.ok) {
      return NextResponse.json({ error: limitCheck.error, code: limitCheck.code }, { status: 403 });
    }

    const branch = await Branch.create({
      ...branchFields,
      organization: orgId,
    });

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
