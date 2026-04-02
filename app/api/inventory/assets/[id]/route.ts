import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const asset = await Asset.findById(id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    if (body.name !== undefined) asset.name = String(body.name).trim();
    if (body.category !== undefined) {
      if (!["electronics", "furniture", "tools", "others"].includes(body.category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      asset.category = body.category;
    }
    if (body.assetTag !== undefined) asset.assetTag = String(body.assetTag).trim().toUpperCase();
    if (body.serialNumber !== undefined) asset.serialNumber = String(body.serialNumber).trim();
    if (body.purchaseDate !== undefined) asset.purchaseDate = new Date(body.purchaseDate);
    if (body.price !== undefined) asset.price = typeof body.price === "number" ? body.price : Number(body.price) || 0;
    if (body.condition !== undefined) {
      if (!["good", "damaged", "repair"].includes(body.condition)) {
        return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
      }
      asset.condition = body.condition;
    }
    if (body.location !== undefined) asset.location = String(body.location).trim();

    if (body.status !== undefined) {
      if (!["available", "assigned", "maintenance", "retired"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (body.status === "available") {
        await AssetAssignment.updateMany(
          { assetId: asset._id, status: "active" },
          { $set: { status: "returned", returnedDate: new Date() } }
        );
        asset.assignedTo = null;
      }
      asset.status = body.status;
    }

    await asset.save();
    const populated = await Asset.findById(asset._id).populate("assignedTo", "name email").lean();
    return NextResponse.json({ asset: populated });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json({ error: "Asset tag already exists" }, { status: 400 });
    }
    console.error("PUT /api/inventory/assets/[id]", err);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
