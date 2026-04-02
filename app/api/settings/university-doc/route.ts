import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const canEdit = session.user.role === "super_admin" || (session.user.permissions ?? []).includes("settings");
    if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const key = `settings/uni-docs/${Date.now()}-${safeSegment(file.name)}.${ext}`;
    const blob = await put(key, file, { access: "public" });

    return NextResponse.json({
      path: blob.url,
      originalName: file.name,
    });
  } catch (err) {
    console.error("POST /api/settings/university-doc error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
