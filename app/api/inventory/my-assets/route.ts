import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import "@/models/User";
import "@/models/Branch";
import { inventoryOrgScope } from "@/lib/inventory/scope";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const assets = await Asset.find({
      assignedTo: session.user.id,
      status: "assigned",
      ...orgScope,
    })
      .populate("branch", "name")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ assets });
  } catch (err) {
    console.error("GET /api/inventory/my-assets", err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}
