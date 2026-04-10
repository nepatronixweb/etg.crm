import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import Branch from "@/models/Branch";
import { getAppSettingsLeanForOrganizationId } from "@/lib/appSettingsScope";
import { isRoleSlugAllowed, normalizeApplicationRoles } from "@/lib/applicationRoles";
import { getBranchIdsInOrganization, isBranchInOrganization } from "@/lib/orgUserScope";

function canManageUsers(session: { user: { role: string; permissions?: string[] } }): boolean {
  if (session.user.role === "super_admin") return true;
  return (session.user.permissions ?? []).includes("users");
}

function sanitizeDashboardWidgets(input: unknown): Record<string, boolean> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = String(k).slice(0, 128);
    if (typeof v === "boolean") o[key] = v;
  }
  return o;
}

function sanitizeDashboardOrder(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const key = String(k).slice(0, 64);
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      o[key] = v.map((x) => String(x).slice(0, 128));
    }
  }
  return o;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    if (roleFilter === "counsellor") {
      if (session.user.role === "super_admin") {
        const counsellors = await User.find({ role: "counsellor", isActive: true })
          .populate("branch", "name")
          .select("_id name email role branch")
          .sort({ name: 1 });
        return NextResponse.json(counsellors);
      }
      const orgId = session.user.organizationId;
      if (!orgId) {
        return NextResponse.json([]);
      }
      const branchIds = await getBranchIdsInOrganization(orgId);
      const counsellors = await User.find({
        role: "counsellor",
        isActive: true,
        branch: { $in: branchIds },
      })
        .populate("branch", "name")
        .select("_id name email role branch")
        .sort({ name: 1 });
      return NextResponse.json(counsellors);
    }

    if (!canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listFilter =
      session.user.role === "super_admin"
        ? {}
        : session.user.organizationId
          ? { branch: { $in: await getBranchIdsInOrganization(session.user.organizationId) } }
          : { _id: { $exists: false } };

    const users = await User.find(listFilter).populate("branch", "name").select("-password").sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await req.json();
    const {
      name,
      email,
      password,
      role,
      branch,
      dateOfBirth,
      phone,
      target,
      permissions,
      hrRole,
      monthlySalary,
      workingDays,
      workingHoursPerDay,
      officeNetworkIp,
    } = body;

    if (role === "super_admin" && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can create super admin accounts" }, { status: 403 });
    }

    if (session.user.role !== "super_admin") {
      if (!session.user.organizationId) {
        return NextResponse.json({ error: "Organization context required" }, { status: 403 });
      }
      if (!branch) {
        return NextResponse.json({ error: "Branch is required" }, { status: 400 });
      }
      const inOrg = await isBranchInOrganization(String(branch), session.user.organizationId);
      if (!inOrg) {
        return NextResponse.json({ error: "Branch is not in your organization" }, { status: 403 });
      }
    }

    let orgIdForCatalog: string | null = session.user.organizationId ?? null;
    if (branch) {
      const br = await Branch.findById(branch).select("organization").lean();
      if (br?.organization) orgIdForCatalog = br.organization.toString();
    }
    const settingsDoc = await getAppSettingsLeanForOrganizationId(orgIdForCatalog);
    const roleCatalog = normalizeApplicationRoles(settingsDoc?.applicationRoles);
    if (!isRoleSlugAllowed(String(role), roleCatalog)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const dashboardWidgets = sanitizeDashboardWidgets(body.dashboardWidgets);
    const dashboardWidgetOrder = sanitizeDashboardOrder(body.dashboardWidgetOrder);
    const hrPayload: Record<string, unknown> = {};
    if (session.user.role === "super_admin") {
      if (hrRole === "admin" || hrRole === "employee") hrPayload.hrRole = hrRole;
      if (typeof monthlySalary === "number" && monthlySalary >= 0) hrPayload.monthlySalary = monthlySalary;
      if (typeof workingDays === "number" && workingDays >= 1) hrPayload.workingDays = workingDays;
      if (typeof workingHoursPerDay === "number" && workingHoursPerDay >= 0 && workingHoursPerDay <= 24) {
        hrPayload.workingHoursPerDay = workingHoursPerDay;
      }
      if (typeof officeNetworkIp === "string") {
        hrPayload.officeNetworkIp = officeNetworkIp.trim().slice(0, 128);
      }
    }
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      permissions: Array.isArray(permissions) ? permissions : [],
      branch,
      dateOfBirth,
      phone,
      target,
      dashboardWidgets,
      dashboardWidgetOrder,
      ...hrPayload,
    });

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "CREATE",
      module: "Users",
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Created user with role ${role}`,
    });

    return NextResponse.json({ message: "User created", user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
