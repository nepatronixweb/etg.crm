import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/chat/users — return all active users (for starting new chat)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const users = await User.find({ isActive: true, _id: { $ne: session.user.id } })
    .select("name email role")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(users);
}
