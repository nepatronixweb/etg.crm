import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { getAppSettingsDocumentForSession } from "@/lib/appSettingsScope";
import { deleteBrandingFileByPath, uploadBrandingFile } from "@/lib/brandingStorage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canEdit =
      session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Logo must be 5 MB or smaller" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, GIF, SVG, or WebP images are allowed" }, { status: 400 });
    }

    await connectDB();
    const settings = await getAppSettingsDocumentForSession(session);
    const orgId = settings.organization ? String(settings.organization) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    await deleteBrandingFileByPath(settings.logoPath);
    const logoPath = await uploadBrandingFile(buffer, file.name, file.type, {
      organizationId: orgId,
      kind: "logo",
    });

    settings.logoPath = logoPath;
    await settings.save();

    return NextResponse.json({ logoPath });
  } catch (err) {
    console.error("POST /api/settings/logo error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
