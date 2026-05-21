import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import InventoryStock from "@/models/InventoryStock";
import StockMovement from "@/models/StockMovement";
import "@/models/User";
import "@/models/Branch";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertBranchInSessionOrg, inventoryOrgScope } from "@/lib/inventory/scope";
import { organizationIdForSessionCreate } from "@/lib/tenantRecordAccess";
import type { StockMovementType } from "@/models/StockMovement";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const stockItemId = searchParams.get("stockItemId");
    const orgScope = await inventoryOrgScope(session);
    const filter: Record<string, unknown> = { ...orgScope };
    if (stockItemId && mongoose.Types.ObjectId.isValid(stockItemId)) {
      const item = await InventoryStock.findOne({ _id: stockItemId, ...orgScope }).select("_id").lean();
      if (!item) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
      filter.stockItemId = new mongoose.Types.ObjectId(stockItemId);
    }
    const movements = await StockMovement.find(filter)
      .populate("stockItemId", "name unit")
      .populate("performedBy", "name")
      .populate("targetBranch", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ movements });
  } catch (err) {
    console.error("GET /api/inventory/stock/movements", err);
    return NextResponse.json({ error: "Failed to list movements" }, { status: 500 });
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
    const { stockItemId, type, quantity, reason, targetBranchId } = body as {
      stockItemId?: string;
      type?: StockMovementType;
      quantity?: number;
      reason?: string;
      targetBranchId?: string;
    };

    if (!stockItemId || !type) {
      return NextResponse.json({ error: "stockItemId and type are required" }, { status: 400 });
    }
    const allowed: StockMovementType[] = ["in", "out", "adjust", "transfer"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Invalid movement type" }, { status: 400 });
    }

    const qty = Math.max(0, Number(quantity) || 0);
    if (type !== "adjust" && qty <= 0) {
      return NextResponse.json({ error: "quantity must be greater than 0" }, { status: 400 });
    }

    await connectDB();
    const orgScope = await inventoryOrgScope(session);
    const row = await InventoryStock.findOne({ _id: stockItemId, ...orgScope });
    if (!row) return NextResponse.json({ error: "Stock item not found" }, { status: 404 });

    const prev = row.quantity;
    let next = prev;
    const orgId = organizationIdForSessionCreate(session);

    if (type === "in") {
      next = prev + qty;
    } else if (type === "out") {
      if (qty > prev) return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
      next = prev - qty;
    } else if (type === "adjust") {
      next = qty;
    } else if (type === "transfer") {
      if (!targetBranchId || !mongoose.Types.ObjectId.isValid(targetBranchId)) {
        return NextResponse.json({ error: "targetBranchId is required for transfer" }, { status: 400 });
      }
      if (!(await assertBranchInSessionOrg(session, targetBranchId))) {
        return NextResponse.json({ error: "Invalid target branch" }, { status: 400 });
      }
      const sourceBranchId = row.branch?.toString() ?? "";
      if (sourceBranchId && sourceBranchId === targetBranchId) {
        return NextResponse.json({ error: "Target branch must differ from source branch" }, { status: 400 });
      }
      if (qty > prev) return NextResponse.json({ error: "Insufficient stock to transfer" }, { status: 400 });
      next = prev - qty;

      const targetBranchOid = new mongoose.Types.ObjectId(targetBranchId);
      let target = await InventoryStock.findOne({
        ...orgScope,
        name: row.name,
        branch: targetBranchOid,
      });
      if (!target) {
        target = await InventoryStock.create({
          name: row.name,
          sku: row.sku,
          category: row.category,
          quantity: qty,
          minStock: row.minStock,
          unit: row.unit,
          notes: row.notes,
          branch: targetBranchOid,
          organization: orgId,
        });
        await StockMovement.create({
          stockItemId: target._id,
          type: "in",
          quantity: qty,
          previousQuantity: 0,
          newQuantity: qty,
          reason: `Transfer from ${row.name}`,
          performedBy: session.user.id,
          organization: orgId,
        });
      } else {
        const tPrev = target.quantity;
        target.quantity = tPrev + qty;
        await target.save();
        await StockMovement.create({
          stockItemId: target._id,
          type: "in",
          quantity: qty,
          previousQuantity: tPrev,
          newQuantity: target.quantity,
          reason: `Transfer from ${row.name}`,
          performedBy: session.user.id,
          targetBranch: targetBranchOid,
          organization: orgId,
        });
      }
    }

    row.quantity = next;
    await row.save();

    const delta = Math.abs(next - prev);
    await StockMovement.create({
      stockItemId: row._id,
      type,
      quantity: type === "adjust" ? delta : qty,
      previousQuantity: prev,
      newQuantity: next,
      reason: reason != null ? String(reason).trim().slice(0, 512) : "",
      performedBy: session.user.id,
      targetBranch:
        type === "transfer" && targetBranchId && mongoose.Types.ObjectId.isValid(targetBranchId)
          ? new mongoose.Types.ObjectId(targetBranchId)
          : null,
      organization: orgId,
    });

    const actionMap = {
      in: "STOCK_IN" as const,
      out: "STOCK_OUT" as const,
      adjust: "STOCK_ADJUST" as const,
      transfer: "STOCK_TRANSFER" as const,
    };
    await logInventoryActivity(
      session,
      actionMap[type],
      row._id.toString(),
      row.name,
      `${type.toUpperCase()}: ${prev} → ${next} ${row.unit}${reason ? ` — ${reason}` : ""}`
    );

    const populated = await InventoryStock.findById(row._id).populate("branch", "name").lean();
    return NextResponse.json({ stock: populated });
  } catch (err) {
    console.error("POST /api/inventory/stock/movements", err);
    return NextResponse.json({ error: "Movement failed" }, { status: 500 });
  }
}
