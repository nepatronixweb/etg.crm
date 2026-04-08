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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const user = await User.findById(id).populate("branch", "name").select("-password");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const body = await req.json();

    if (
      body.hrRole !== undefined ||
      body.monthlySalary !== undefined ||
      body.workingDays !== undefined ||
      body.workingHoursPerDay !== undefined ||
      body.officeNetworkIp !== undefined
    ) {
      if (session.user.role !== "super_admin") {
        return NextResponse.json(
          { error: "Only super admins can edit HR fields (salary, working days, hours, network IP, hrRole)" },
          { status: 403 }
        );
      }
      if (body.hrRole !== undefined && body.hrRole !== "admin" && body.hrRole !== "employee") {
        return NextResponse.json({ error: "Invalid hrRole" }, { status: 400 });
      }
      if (body.monthlySalary !== undefined && (typeof body.monthlySalary !== "number" || body.monthlySalary < 0)) {
        return NextResponse.json({ error: "Invalid monthlySalary" }, { status: 400 });
      }
      if (body.workingDays !== undefined && (typeof body.workingDays !== "number" || body.workingDays < 1)) {
        return NextResponse.json({ error: "Invalid workingDays" }, { status: 400 });
      }
      if (
        body.workingHoursPerDay !== undefined &&
        (typeof body.workingHoursPerDay !== "number" || body.workingHoursPerDay < 0 || body.workingHoursPerDay > 24)
      ) {
        return NextResponse.json({ error: "Invalid workingHoursPerDay (0-24)" }, { status: 400 });
      }
      if (body.officeNetworkIp !== undefined && typeof body.officeNetworkIp !== "string") {
        return NextResponse.json({ error: "Invalid officeNetworkIp" }, { status: 400 });
      }
    }

    if (session.user.role !== "super_admin") {
      delete body.hrRole;
      delete body.monthlySalary;
      delete body.workingDays;
      delete body.workingHoursPerDay;
      delete body.officeNetworkIp;
    } else if (typeof body.officeNetworkIp === "string") {
      body.officeNetworkIp = body.officeNetworkIp.trim().slice(0, 128);
    }

    if (body.role !== undefined) {
      const settingsDoc = await AppSettings.findOne().lean();
      const roleCatalog = normalizeApplicationRoles(settingsDoc?.applicationRoles);
      if (!isRoleSlugAllowed(String(body.role), roleCatalog)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
    }

    if (session.user.role !== "super_admin") {
      const target = await User.findById(id).select("role").lean();
      if (target?.role === "super_admin") {
        return NextResponse.json({ error: "Only super admins can edit super admin accounts" }, { status: 403 });
      }
      if (body.role === "super_admin") {
        return NextResponse.json({ error: "Only super admins can assign the super admin role" }, { status: 403 });
      }
    }

    const isPasswordReset = !!body.password;
    if (body.password) body.password = await bcrypt.hash(body.password, 10);
    const user = await User.findByIdAndUpdate(id, body, { new: true }).select("-password");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const action = isPasswordReset ? "PASSWORD_RESET" : "UPDATE";
    const details = isPasswordReset
      ? `Reset password for ${user.name}`
      : `Updated user ${user.name}`;

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action,
      module: "Users",
      targetId: user._id.toString(),
      targetName: user.name,
      details,
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !canManageUsers(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();

    if (session.user.role !== "super_admin") {
      const target = await User.findById(id).select("role").lean();
      if (target?.role === "super_admin") {
        return NextResponse.json({ error: "Only super admins can deactivate super admin accounts" }, { status: 403 });
      }
    }

    await User.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ message: "User deactivated" });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
