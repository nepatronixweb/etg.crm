import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const assets = await Asset.find({})
      .populate("assignedTo", "name email")
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
    } = body;

    if (!name || !category || !assetTag || !purchaseDate) {
      return NextResponse.json({ error: "name, category, assetTag, and purchaseDate are required" }, { status: 400 });
    }

    const allowedCat = ["electronics", "furniture", "tools", "others"];
    if (!allowedCat.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    await connectDB();
    const tag = String(assetTag).trim().toUpperCase();
    const doc = await Asset.create({
      name: String(name).trim(),
      category,
      assetTag: tag,
      serialNumber: serialNumber != null ? String(serialNumber).trim() : "",
      purchaseDate: new Date(purchaseDate),
      price: typeof price === "number" ? price : Number(price) || 0,
      condition: ["good", "damaged", "repair"].includes(condition) ? condition : "good",
      status: ["available", "assigned", "maintenance", "retired"].includes(status) ? status : "available",
      location: location != null ? String(location).trim() : "",
      assignedTo: null,
    });
    const populated = await Asset.findById(doc._id).populate("assignedTo", "name email").lean();
    return NextResponse.json({ asset: populated }, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json({ error: "Asset tag already exists" }, { status: 400 });
    }
    console.error("POST /api/inventory/assets", err);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
