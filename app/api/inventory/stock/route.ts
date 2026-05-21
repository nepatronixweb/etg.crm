import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import InventoryStock from "@/models/InventoryStock";
import StockMovement from "@/models/StockMovement";
import "@/models/Branch";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertBranchInSessionOrg, inventoryOrgScope, inventoryStockQueryScope } from "@/lib/inventory/scope";
import { getInventoryConfigForSession } from "@/lib/inventory/settings";
import { isInventoryCategoryAllowed } from "@/lib/inventoryConfig";
import { organizationIdForSessionCreate } from "@/lib/tenantRecordAccess";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = await inventoryStockQueryScope(session, {
      branchId: searchParams.get("branch"),
      search: searchParams.get("search"),
      category: searchParams.get("category"),
    });
    const stock = await InventoryStock.find(filter).populate("branch", "name").sort({ name: 1 }).lean();
    return NextResponse.json({ stock });
  } catch (err) {
    console.error("GET /api/inventory/stock", err);
    return NextResponse.json({ error: "Failed to list stock" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { name, quantity, minStock, unit, category, sku, notes, branch } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const config = await getInventoryConfigForSession(session);
    const cat = category != null ? String(category).trim() : "others";
    if (!isInventoryCategoryAllowed(cat, config.categories)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const unitVal = unit != null ? String(unit).trim() : "pcs";
    if (!config.units.includes(unitVal)) {
      return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
    }
    if (branch && !(await assertBranchInSessionOrg(session, String(branch)))) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    await connectDB();
    const qty = Math.max(0, Number(quantity) || 0);
    const orgScope = await inventoryOrgScope(session);
    const orgId = organizationIdForSessionCreate(session);
    const branchOid =
      branch && mongoose.Types.ObjectId.isValid(String(branch))
        ? new mongoose.Types.ObjectId(String(branch))
        : null;

    const duplicate = await InventoryStock.findOne({
      ...orgScope,
      name: String(name).trim(),
      branch: branchOid,
    }).select("_id");
    if (duplicate) {
      return NextResponse.json(
        { error: "A stock item with this name already exists at this branch" },
        { status: 400 }
      );
    }

    const row = await InventoryStock.create({
      name: String(name).trim(),
      sku: sku != null ? String(sku).trim().toUpperCase().slice(0, 64) : "",
      category: cat,
      quantity: qty,
      minStock: Math.max(0, Number(minStock) || 0),
      unit: unitVal,
      notes: notes != null ? String(notes).trim().slice(0, 1000) : "",
      branch: branch && mongoose.Types.ObjectId.isValid(String(branch)) ? branch : null,
      organization: orgId,
    });

    if (qty > 0) {
      await StockMovement.create({
        stockItemId: row._id,
        type: "in",
        quantity: qty,
        previousQuantity: 0,
        newQuantity: qty,
        reason: "Initial stock",
        performedBy: session.user.id,
        organization: row.organization,
      });
    }

    await logInventoryActivity(session, "CREATE", row._id.toString(), row.name, `Created stock item (${qty} ${unitVal})`);
    const populated = await InventoryStock.findById(row._id).populate("branch", "name").lean();
    return NextResponse.json({ stock: populated }, { status: 201 });
  } catch (err) {
    console.error("POST /api/inventory/stock", err);
    return NextResponse.json({ error: "Failed to save stock" }, { status: 500 });
  }
}
