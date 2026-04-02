import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import InventoryStock from "@/models/InventoryStock";
import { canManageInventory } from "@/lib/inventory/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const [totalAssets, assignedCount, availableCount, stockRows] = await Promise.all([
      Asset.countDocuments({}),
      Asset.countDocuments({ status: "assigned" }),
      Asset.countDocuments({ status: "available" }),
      InventoryStock.find({ $expr: { $lt: ["$quantity", "$minStock"] } }).sort({ name: 1 }).lean(),
    ]);

    return NextResponse.json({
      totalAssets,
      assignedCount,
      availableCount,
      lowStock: stockRows,
    });
  } catch (err) {
    console.error("GET /api/inventory/summary", err);
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
