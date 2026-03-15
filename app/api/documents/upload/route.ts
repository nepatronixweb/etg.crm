import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

// This route handles the client upload protocol for @vercel/blob/client
// The file goes directly from browser → Vercel Blob (never through this function)
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session) throw new Error("Unauthorized");
        return {
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        };
      },
      onUploadCompleted: async () => {
        // Document record is created separately via POST /api/documents
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("POST /api/documents/upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
