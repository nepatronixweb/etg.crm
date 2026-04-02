import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";
import AppSettings from "@/models/AppSettings";
import { isRoleSlugAllowed, normalizeApplicationRoles } from "@/lib/applicationRoles";

function canManageUsers(session: { user: { role: string; permissions?: string[] } }): boolean {
  if (session.user.role === "super_admin") return true;
  return (session.user.permissions ?? []).includes("users");
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    if (roleFilter === "counsellor") {
      const counsellors = await User.find({ role: "counsellor", isActive: true })
        .populate("branch", "name")
        .select("_id name email role branch")
        .sort({ name: 1 });
      return NextResponse.json(counsellors);
    }

    if (!canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const users = await User.find({}).populate("branch", "name").select("-password").sort({ createdAt: -1 });
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

    const settingsDoc = await AppSettings.findOne().lean();
    const roleCatalog = normalizeApplicationRoles(settingsDoc?.applicationRoles);
    if (!isRoleSlugAllowed(String(role), roleCatalog)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
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
