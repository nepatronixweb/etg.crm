import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatAccessDeniedResponse } from "@/lib/chatPermissions";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { tenantUserScopeForSession } from "@/lib/tenantRecordAccess";

// GET /api/chat/users - return all active users (for starting new chat)
export async function GET() {
  const session = await auth();
  const denied = await chatAccessDeniedResponse(session);
  if (denied) return denied;

  await connectDB();

  const userScope =
    session!.user.role === "super_admin" ? {} : await tenantUserScopeForSession(session!);
  const users = await User.find({ isActive: true, _id: { $ne: session!.user.id }, ...userScope })
    .select("name email role")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(users);
}
