import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import "@/models/User";
import "@/models/Branch";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertBranchInSessionOrg, inventoryQueryScope } from "@/lib/inventory/scope";
import { getInventoryConfigForSession } from "@/lib/inventory/settings";
import { isInventoryCategoryAllowed } from "@/lib/inventoryConfig";
import {
  organizationIdForSessionCreate,
} from "@/lib/tenantRecordAccess";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter = await inventoryQueryScope(session, {
      branchId: searchParams.get("branch"),
      search: searchParams.get("search"),
      category: searchParams.get("category"),
      status: searchParams.get("status"),
    });
    const assets = await Asset.find(filter)
      .populate("assignedTo", "name email")
      .populate("branch", "name")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ assets });
  } catch (err) {
    console.error("GET /api/inventory/assets", err);
    return NextResponse.json({ error: "Failed to list assets" }, { status: 500 });
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
    const {
      name,
      category,
      assetTag,
      serialNumber,
      purchaseDate,
      price,
      condition,
      status,
      location,
      notes,
      warrantyExpiry,
      branch,
    } = body;

    if (!name || !category || !assetTag || !purchaseDate) {
      return NextResponse.json({ error: "name, category, assetTag, and purchaseDate are required" }, { status: 400 });
    }

    const config = await getInventoryConfigForSession(session);
    if (!isInventoryCategoryAllowed(String(category), config.categories)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (branch && !(await assertBranchInSessionOrg(session, String(branch)))) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    await connectDB();
    const tag = String(assetTag).trim().toUpperCase();
    const orgId = organizationIdForSessionCreate(session);
    const doc = await Asset.create({
      name: String(name).trim(),
      category: String(category).trim(),
      assetTag: tag,
      serialNumber: serialNumber != null ? String(serialNumber).trim() : "",
      purchaseDate: new Date(purchaseDate),
      price: typeof price === "number" ? price : Number(price) || 0,
      condition: ["good", "damaged", "repair"].includes(condition) ? condition : "good",
      status: ["available", "assigned", "maintenance", "retired"].includes(status) ? status : "available",
      location: location != null ? String(location).trim() : "",
      notes: notes != null ? String(notes).trim().slice(0, 2000) : "",
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      branch: branch && mongoose.Types.ObjectId.isValid(String(branch)) ? branch : null,
      assignedTo: null,
      organization: orgId,
    });
    await logInventoryActivity(session, "CREATE", doc._id.toString(), doc.name, `Created asset ${tag}`);
    const populated = await Asset.findById(doc._id)
      .populate("assignedTo", "name email")
      .populate("branch", "name")
      .lean();
    return NextResponse.json({ asset: populated }, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json({ error: "Asset tag already exists in this organization" }, { status: 400 });
    }
    console.error("POST /api/inventory/assets", err);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
