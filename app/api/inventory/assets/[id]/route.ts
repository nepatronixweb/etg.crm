import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import "@/models/User";
import "@/models/Branch";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertBranchInSessionOrg, inventoryOrgScope } from "@/lib/inventory/scope";
import { getInventoryConfigForSession } from "@/lib/inventory/settings";
import { isInventoryCategoryAllowed } from "@/lib/inventoryConfig";

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
    const asset = await Asset.findOne({ _id: id, ...orgScope })
      .populate("assignedTo", "name email")
      .populate("branch", "name")
      .lean();
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (err) {
    console.error("GET /api/inventory/assets/[id]", err);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const config = await getInventoryConfigForSession(session);

    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const asset = await Asset.findOne({ _id: id, ...orgScope });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    if (body.name !== undefined) asset.name = String(body.name).trim();
    if (body.category !== undefined) {
      if (!isInventoryCategoryAllowed(String(body.category), config.categories)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      asset.category = String(body.category).trim();
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
    if (body.notes !== undefined) asset.notes = String(body.notes).trim().slice(0, 2000);
    if (body.warrantyExpiry !== undefined) {
      asset.warrantyExpiry = body.warrantyExpiry ? new Date(body.warrantyExpiry) : null;
    }
    if (body.branch !== undefined) {
      const branchVal = body.branch ? String(body.branch) : "";
      if (branchVal && !(await assertBranchInSessionOrg(session, branchVal))) {
        return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      }
      asset.branch =
        branchVal && mongoose.Types.ObjectId.isValid(branchVal)
          ? new mongoose.Types.ObjectId(branchVal)
          : null;
    }

    if (body.status !== undefined) {
      if (!["available", "assigned", "maintenance", "retired"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const nextStatus = body.status as string;
      if (nextStatus === "assigned" && asset.status !== "assigned") {
        return NextResponse.json(
          { error: "Use Assign to mark an asset as assigned" },
          { status: 400 }
        );
      }
      if (nextStatus !== "assigned" && asset.status === "assigned") {
        await AssetAssignment.updateMany(
          { assetId: asset._id, status: "active" },
          { $set: { status: "returned", returnedDate: new Date() } }
        );
        asset.assignedTo = null;
      }
      if (nextStatus === "available") {
        asset.assignedTo = null;
      }
      asset.status = nextStatus;
    }

    await asset.save();
    await logInventoryActivity(session, "UPDATE", asset._id.toString(), asset.name, `Updated asset ${asset.assetTag}`);
    const populated = await Asset.findById(asset._id)
      .populate("assignedTo", "name email")
      .populate("branch", "name")
      .lean();
    return NextResponse.json({ asset: populated });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json({ error: "Asset tag already exists in this organization" }, { status: 400 });
    }
    console.error("PUT /api/inventory/assets/[id]", err);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const asset = await Asset.findOne({ _id: id, ...orgScope });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.status === "assigned") {
      return NextResponse.json({ error: "Return the asset before deleting" }, { status: 400 });
    }
    asset.status = "retired";
    await asset.save();
    await logInventoryActivity(session, "DELETE", asset._id.toString(), asset.name, `Retired asset ${asset.assetTag}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/inventory/assets/[id]", err);
    return NextResponse.json({ error: "Failed to retire asset" }, { status: 500 });
  }
}
