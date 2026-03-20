import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";

// GET — return current b2bNames
export async function GET() {
  try {
    await connectDB();
    const s = await AppSettings.findOne().select("b2bNames").lean();
    return NextResponse.json({ b2bNames: s?.b2bNames || [] });
  } catch (err) {
    console.error("GET /api/settings/b2b error:", err);
    return NextResponse.json({ b2bNames: [] });
  }
}

// POST — add a name
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      console.error("POST /api/settings/b2b: Forbidden, role=", session?.user?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    await connectDB();
    const result = await AppSettings.findOneAndUpdate(
      {},
      { $addToSet: { b2bNames: name.trim() } },
      { new: true, upsert: true }
    );
    console.log("POST /api/settings/b2b: added", name, "=> b2bNames:", result.b2bNames);
    return NextResponse.json({ b2bNames: result.b2bNames });
  } catch (err) {
    console.error("POST /api/settings/b2b error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE — remove a name
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      console.error("DELETE /api/settings/b2b: Forbidden, role=", session?.user?.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    await connectDB();
    const result = await AppSettings.findOneAndUpdate(
      {},
      { $pull: { b2bNames: name.trim() } },
      { new: true }
    );
    console.log("DELETE /api/settings/b2b: removed", name, "=> b2bNames:", result?.b2bNames);
    return NextResponse.json({ b2bNames: result?.b2bNames || [] });
  } catch (err) {
    console.error("DELETE /api/settings/b2b error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
