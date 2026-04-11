import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";

export const dynamic = "force-dynamic";

// GET - return current b2bNames for the signed-in tenant (or platform when no session).
export async function GET() {
  try {
    await connectDB();
    const session = await auth();
    const s = await getAppSettingsDocumentForSession(session);
    return NextResponse.json({ b2bNames: s.b2bNames || [] });
  } catch (err) {
    console.error("GET /api/settings/b2b error:", err);
    return NextResponse.json({ b2bNames: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const canEdit = session && (session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings"));
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    await connectDB();
    const target = await getAppSettingsDocumentForSession(session);
    const result = await AppSettings.findByIdAndUpdate(
      target._id,
      { $addToSet: { b2bNames: name.trim() } },
      { new: true }
    );
    if (!result) return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    console.log("POST /api/settings/b2b: added", name, "=> b2bNames:", result.b2bNames);
    return NextResponse.json({ b2bNames: result.b2bNames });
  } catch (err) {
    console.error("POST /api/settings/b2b error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const canEdit = session && (session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings"));
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    await connectDB();
    const target = await getAppSettingsDocumentForSession(session);
    const result = await AppSettings.findByIdAndUpdate(
      target._id,
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
