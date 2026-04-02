import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import User from "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { assetId, userId } = body;
    if (!assetId || !userId) {
      return NextResponse.json({ error: "assetId and userId are required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) return NextResponse.json({ error: "User not found or inactive" }, { status: 400 });

    const asset = await Asset.findById(assetId);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.status !== "available") {
      return NextResponse.json({ error: "Asset is not available for assignment" }, { status: 400 });
    }

    await AssetAssignment.create({
      assetId: asset._id,
      userId: user._id,
      assignedDate: new Date(),
      status: "active",
    });

    asset.status = "assigned";
    asset.assignedTo = user._id;
    await asset.save();

    const populated = await Asset.findById(asset._id).populate("assignedTo", "name email").lean();
    return NextResponse.json({ ok: true, asset: populated });
  } catch (err) {
    console.error("POST /api/inventory/assign", err);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
