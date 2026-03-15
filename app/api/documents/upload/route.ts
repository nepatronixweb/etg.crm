import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

// Accepts the raw file body (not FormData) to bypass the 4.5MB body parser limit.
// The filename and metadata are passed via headers/query params.
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const filename = req.nextUrl.searchParams.get("filename");
    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

    if (!req.body) return NextResponse.json({ error: "No body" }, { status: 400 });

    const blob = await put(filename, req.body, {
      access: "public",
    });

    return NextResponse.json(blob);
  } catch (err) {
    console.error("PUT /api/documents/upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
