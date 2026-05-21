import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import InventoryStock from "@/models/InventoryStock";
import StockMovement from "@/models/StockMovement";
import "@/models/Branch";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertBranchInSessionOrg, inventoryOrgScope } from "@/lib/inventory/scope";
import { getInventoryConfigForSession } from "@/lib/inventory/settings";
import { isInventoryCategoryAllowed } from "@/lib/inventoryConfig";

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
    const row = await InventoryStock.findOne({ _id: id, ...orgScope });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.name !== undefined) row.name = String(body.name).trim();
    if (body.sku !== undefined) row.sku = String(body.sku).trim().toUpperCase().slice(0, 64);
    if (body.category !== undefined) {
      if (!isInventoryCategoryAllowed(String(body.category), config.categories)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      row.category = String(body.category).trim();
    }
    if (body.minStock !== undefined) row.minStock = Math.max(0, Number(body.minStock) || 0);
    if (body.unit !== undefined) {
      const unitVal = String(body.unit).trim();
      if (!config.units.includes(unitVal)) {
        return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
      }
      row.unit = unitVal;
    }
    if (body.notes !== undefined) row.notes = String(body.notes).trim().slice(0, 1000);
    if (body.branch !== undefined) {
      const branchVal = body.branch ? String(body.branch) : "";
      if (branchVal && !(await assertBranchInSessionOrg(session, branchVal))) {
        return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      }
      row.branch =
        branchVal && mongoose.Types.ObjectId.isValid(branchVal)
          ? new mongoose.Types.ObjectId(branchVal)
          : null;
    }

    const nextName = row.name;
    const nextBranch = row.branch ?? null;
    const duplicate = await InventoryStock.findOne({
      ...orgScope,
      _id: { $ne: row._id },
      name: nextName,
      branch: nextBranch,
    }).select("_id");
    if (duplicate) {
      return NextResponse.json(
        { error: "A stock item with this name already exists at this branch" },
        { status: 400 }
      );
    }

    await row.save();
    await logInventoryActivity(session, "UPDATE", row._id.toString(), row.name, "Updated stock item details");
    const populated = await InventoryStock.findById(row._id).populate("branch", "name").lean();
    return NextResponse.json({ stock: populated });
  } catch (err) {
    console.error("PUT /api/inventory/stock/[id]", err);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
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
    const row = await InventoryStock.findOne({ _id: id, ...orgScope });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.quantity > 0) {
      return NextResponse.json(
        { error: "Set quantity to zero before deleting this stock item" },
        { status: 400 }
      );
    }

    await StockMovement.deleteMany({ stockItemId: row._id });
    await InventoryStock.deleteOne({ _id: row._id });
    await logInventoryActivity(session, "DELETE", row._id.toString(), row.name, "Deleted stock item");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/inventory/stock/[id]", err);
    return NextResponse.json({ error: "Failed to delete stock" }, { status: 500 });
  }
}
