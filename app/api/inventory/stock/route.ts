import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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
    const stock = await InventoryStock.find({}).sort({ name: 1 }).lean();
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
    const { id, name, quantity, minStock, unit } = body;

    await connectDB();

    if (id) {
      const row = await InventoryStock.findById(id);
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (name !== undefined) row.name = String(name).trim();
      if (quantity !== undefined) row.quantity = Math.max(0, Number(quantity) || 0);
      if (minStock !== undefined) row.minStock = Math.max(0, Number(minStock) || 0);
      if (unit !== undefined) row.unit = String(unit).trim() || "pcs";
      await row.save();
      return NextResponse.json({ stock: row.toObject() });
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const row = await InventoryStock.create({
      name: String(name).trim(),
      quantity: Math.max(0, Number(quantity) || 0),
      minStock: Math.max(0, Number(minStock) || 0),
      unit: unit != null ? String(unit).trim() : "pcs",
    });
    return NextResponse.json({ stock: row.toObject() }, { status: 201 });
  } catch (err) {
    console.error("POST /api/inventory/stock", err);
    return NextResponse.json({ error: "Failed to save stock" }, { status: 500 });
  }
}
