import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";

/** Active users for assign-asset dropdown (inventory managers only). */
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find({ isActive: true })
      .select("_id name email role")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/inventory/users", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
