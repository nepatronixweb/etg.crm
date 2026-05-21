import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";
import { inventoryOrgScope } from "@/lib/inventory/scope";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const asset = await Asset.findOne({ _id: id, ...orgScope }).select("_id").lean();
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const assignments = await AssetAssignment.find({ assetId: asset._id })
      .populate("userId", "name email")
      .populate("assignedBy", "name")
      .sort({ assignedDate: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ assignments });
  } catch (err) {
    console.error("GET /api/inventory/assets/[id]/assignments", err);
    return NextResponse.json({ error: "Failed to load assignment history" }, { status: 500 });
  }
}
