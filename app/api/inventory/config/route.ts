import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";
import { canManageInventory } from "@/lib/inventory/auth";
import { getInventoryConfigForSession } from "@/lib/inventory/settings";
import { normalizeInventoryCategories, normalizeInventoryUnits } from "@/lib/inventoryConfig";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const config = await getInventoryConfigForSession(session);
    return NextResponse.json(config);
  } catch (err) {
    console.error("GET /api/inventory/config", err);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    await connectDB();
    const target = await getAppSettingsDocumentForSession(session);
    const $set: Record<string, unknown> = {};
    if (body.categories !== undefined) {
      $set.inventoryCategories = normalizeInventoryCategories(body.categories);
    }
    if (body.units !== undefined) {
      $set.inventoryUnits = normalizeInventoryUnits(body.units);
    }
    if (Object.keys($set).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    await AppSettings.findByIdAndUpdate(target._id, { $set }, { new: true, runValidators: false });
    const config = await getInventoryConfigForSession(session);
    return NextResponse.json(config);
  } catch (err) {
    console.error("PATCH /api/inventory/config", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
