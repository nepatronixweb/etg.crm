import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import connectDB from "@/lib/mongodb";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canEdit = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("qr") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const blob = await put(`branding/payment-qr-${Date.now()}.${ext}`, file, {
      access: "public",
    });
    const paymentQrPath = blob.url;

    await connectDB();
    const settings = await getAppSettingsDocumentForSession(session);
    settings.paymentQrPath = paymentQrPath;
    await settings.save();

    return NextResponse.json({ paymentQrPath });
  } catch (err) {
    console.error("POST /api/settings/qr error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
