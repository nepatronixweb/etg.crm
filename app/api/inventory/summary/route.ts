import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import InventoryStock from "@/models/InventoryStock";
import { canManageInventory } from "@/lib/inventory/auth";
import { inventoryOrgScope, inventoryQueryScope, inventoryStockQueryScope } from "@/lib/inventory/scope";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branch");

    const assetFilter = await inventoryQueryScope(session, { branchId, status: "active" });
    const stockFilter = await inventoryStockQueryScope(session, { branchId });

    const orgScope = await inventoryOrgScope(session);
    const byBranchMatch = branchId
      ? await inventoryQueryScope(session, { branchId, status: "active" })
      : { ...orgScope, status: { $ne: "retired" } };

    const [totalAssets, assignedCount, availableCount, maintenanceCount, stockRows, totalAssetValue, byBranch] =
      await Promise.all([
        Asset.countDocuments(assetFilter),
        Asset.countDocuments({ ...assetFilter, status: "assigned" }),
        Asset.countDocuments({ ...assetFilter, status: "available" }),
        Asset.countDocuments({ ...assetFilter, status: "maintenance" }),
        InventoryStock.find({ ...stockFilter, $expr: { $lt: ["$quantity", "$minStock"] } })
          .populate("branch", "name")
          .sort({ name: 1 })
          .lean(),
        Asset.aggregate([
          { $match: assetFilter },
          { $group: { _id: null, total: { $sum: "$price" } } },
        ]),
        Asset.aggregate([
          { $match: byBranchMatch },
          { $group: { _id: "$branch", count: { $sum: 1 }, value: { $sum: "$price" } } },
          { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "br" } },
          { $unwind: { path: "$br", preserveNullAndEmptyArrays: true } },
          { $project: { branchId: "$_id", branchName: { $ifNull: ["$br.name", "Unassigned"] }, count: 1, value: 1 } },
          { $sort: { count: -1 } },
        ]),
      ]);

    return NextResponse.json({
      totalAssets,
      assignedCount,
      availableCount,
      maintenanceCount,
      totalAssetValue: totalAssetValue[0]?.total ?? 0,
      lowStock: stockRows,
      byBranch: byBranch.map((b: { branchId?: mongoose.Types.ObjectId; branchName: string; count: number; value: number }) => ({
        branchId: b.branchId?.toString() ?? null,
        branchName: b.branchName,
        count: b.count,
        value: b.value,
      })),
    });
  } catch (err) {
    console.error("GET /api/inventory/summary", err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
