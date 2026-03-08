import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import connectDB from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "png";
    const blob = await put(`branding/logo-${Date.now()}.${ext}`, file, {
      access: "public",
    });
    const logoPath = blob.url;

    await connectDB();
    let settings = await AppSettings.findOne();
    if (!settings) settings = new AppSettings();
    settings.logoPath = logoPath;
    await settings.save();

    return NextResponse.json({ logoPath });
  } catch (err) {
    console.error("POST /api/settings/logo error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
