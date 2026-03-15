import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";

// Chunk size for client uploads (4MB to stay within Vercel's 4.5MB body limit)
const CHUNK_SIZE = 4 * 1024 * 1024;

// Initialize a chunked upload – returns an uploadId to append chunks to
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const { fileName, fileType, fileSize } = body;
    if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });

    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB not connected" }, { status: 500 });

    const tempCollection = db.collection("_pendingUploads");
    const result = await tempCollection.insertOne({
      fileName,
      fileType: fileType || "application/octet-stream",
      fileSize: fileSize || 0,
      uploadedBy: session.user.id,
      createdAt: new Date(),
    });

    return NextResponse.json({
      uploadId: result.insertedId.toString(),
      chunkSize: CHUNK_SIZE,
    });
  } catch (err) {
    console.error("POST /api/documents/upload error:", err);
    const message = err instanceof Error ? err.message : "Upload init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Append a chunk to an in-progress upload
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const uploadId = req.nextUrl.searchParams.get("uploadId");
    const chunkIndex = req.nextUrl.searchParams.get("chunkIndex");
    const totalChunks = req.nextUrl.searchParams.get("totalChunks");

    if (!uploadId || chunkIndex === null || totalChunks === null) {
      return NextResponse.json({ error: "uploadId, chunkIndex, totalChunks required" }, { status: 400 });
    }

    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB not connected" }, { status: 500 });

    const body = await req.arrayBuffer();
    const buffer = Buffer.from(body);

    const tempCollection = db.collection("_pendingUploads");
    const pending = await tempCollection.findOne({
      _id: new mongoose.Types.ObjectId(uploadId),
    });
    if (!pending) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

    // Store chunk data
    const chunkCollection = db.collection("_uploadChunks");
    await chunkCollection.insertOne({
      uploadId: new mongoose.Types.ObjectId(uploadId),
      index: parseInt(chunkIndex),
      data: buffer,
    });

    const currentIdx = parseInt(chunkIndex);
    const total = parseInt(totalChunks);

    // If this is the last chunk, assemble into GridFS
    if (currentIdx === total - 1) {
      const allChunks = await chunkCollection
        .find({ uploadId: new mongoose.Types.ObjectId(uploadId) })
        .sort({ index: 1 })
        .toArray();

      const fullBuffer = Buffer.concat(allChunks.map((c) => {
        const d = c.data;
        if (Buffer.isBuffer(d)) return d;
        if (d.buffer) return Buffer.from(d.buffer);
        return Buffer.from(d);
      }));

      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "documents" });
      const uploadStream = bucket.openUploadStream(pending.fileName, {
        metadata: {
          contentType: pending.fileType,
          uploadedBy: pending.uploadedBy,
          originalName: pending.fileName,
        },
      });

      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);
        uploadStream.end(fullBuffer);
      });

      // Cleanup temp data
      await chunkCollection.deleteMany({ uploadId: new mongoose.Types.ObjectId(uploadId) });
      await tempCollection.deleteOne({ _id: new mongoose.Types.ObjectId(uploadId) });

      const fileId = uploadStream.id.toString();
      return NextResponse.json({
        done: true,
        fileId,
        url: `/api/documents/file/${fileId}`,
        originalName: pending.fileName,
        fileSize: pending.fileSize,
        fileType: pending.fileType,
      });
    }

    return NextResponse.json({ done: false, chunkIndex: currentIdx });
  } catch (err) {
    console.error("PUT /api/documents/upload error:", err);
    const message = err instanceof Error ? err.message : "Chunk upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
