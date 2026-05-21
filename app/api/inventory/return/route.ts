import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { inventoryOrgScope } from "@/lib/inventory/scope";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { assetId, conditionOnReturn, notes } = body;
    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const asset = await Asset.findOne({ _id: assetId, ...orgScope });
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
    if (conditionOnReturn) assignment.conditionOnReturn = String(conditionOnReturn).trim();
    if (notes) assignment.notes = String(notes).trim().slice(0, 512);
    await assignment.save();

    if (conditionOnReturn && ["good", "damaged", "repair"].includes(String(conditionOnReturn))) {
      asset.condition = conditionOnReturn;
    }

    asset.status = "available";
    asset.assignedTo = null;
    await asset.save();

    await logInventoryActivity(
      session,
      "RETURN",
      asset._id.toString(),
      asset.name,
      `Returned asset ${asset.assetTag}`
    );

    const populated = await Asset.findById(asset._id).populate("assignedTo", "name email").populate("branch", "name").lean();
    return NextResponse.json({ ok: true, asset: populated });
  } catch (err) {
    console.error("POST /api/inventory/return", err);
    return NextResponse.json({ error: "Return failed" }, { status: 500 });
  }
}
