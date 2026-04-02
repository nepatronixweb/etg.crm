import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import { canManageInventory } from "@/lib/inventory/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { assetId } = body;
    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    await connectDB();
    const asset = await Asset.findById(assetId);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const assignment = await AssetAssignment.findOne({
      assetId: asset._id,
      status: "active",
    }).sort({ assignedDate: -1 });

    if (!assignment) {
      return NextResponse.json({ error: "No active assignment for this asset" }, { status: 400 });
    }

    assignment.status = "returned";
    assignment.returnedDate = new Date();
    await assignment.save();

    asset.status = "available";
    asset.assignedTo = null;
    await asset.save();

    const populated = await Asset.findById(asset._id).populate("assignedTo", "name email").lean();
    return NextResponse.json({ ok: true, asset: populated });
  } catch (err) {
    console.error("POST /api/inventory/return", err);
    return NextResponse.json({ error: "Return failed" }, { status: 500 });
  }
}
