import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Asset from "@/models/Asset";
import AssetAssignment from "@/models/AssetAssignment";
import User from "@/models/User";
import { canManageInventory } from "@/lib/inventory/auth";
import { logInventoryActivity } from "@/lib/inventory/activity";
import { assertUserInTenant, organizationIdForSessionCreate } from "@/lib/tenantRecordAccess";
import { inventoryOrgScope } from "@/lib/inventory/scope";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageInventory(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { assetId, userId, notes } = body;
    if (!assetId || !userId) {
      return NextResponse.json({ error: "assetId and userId are required" }, { status: 400 });
    }

    await connectDB();
    if (!(await assertUserInTenant(session, String(userId)))) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 400 });
    }
    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) return NextResponse.json({ error: "User not found or inactive" }, { status: 400 });

    const orgScope = await inventoryOrgScope(session);
    const asset = await Asset.findOne({ _id: assetId, ...orgScope });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.status !== "available") {
      return NextResponse.json({ error: "Asset is not available for assignment" }, { status: 400 });
    }

    const orgId = organizationIdForSessionCreate(session);

    await AssetAssignment.create({
      assetId: asset._id,
      userId: user._id,
      assignedBy: session.user.id,
      assignedDate: new Date(),
      status: "active",
      notes: notes != null ? String(notes).trim().slice(0, 512) : "",
      organization: orgId,
    });

    asset.status = "assigned";
    asset.assignedTo = user._id;
    await asset.save();

    await logInventoryActivity(
      session,
      "ASSIGN",
      asset._id.toString(),
      asset.name,
      `Assigned ${asset.assetTag} to ${user.name}`
    );

    const populated = await Asset.findById(asset._id).populate("assignedTo", "name email").populate("branch", "name").lean();
    return NextResponse.json({ ok: true, asset: populated });
  } catch (err) {
    console.error("POST /api/inventory/assign", err);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
