// Chunked upload helper for large files — bypasses Vercel's 4.5MB body limit
// by splitting the file into smaller pieces and reassembling on the server.

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks

export interface UploadResult {
  fileId: string;
  url: string;
  originalName: string;
  fileSize: number;
  fileType: string;
}

export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // If file is small enough (<4MB), do a single-chunk upload
  // Step 1: Initialize upload
  const initRes = await fetch("/api/documents/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.json();
    throw new Error(err?.error || "Failed to initialize upload");
  }
  const { uploadId } = await initRes.json();

  // Step 2: Send chunks sequentially
  let result: UploadResult | null = null;
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const buffer = await chunk.arrayBuffer();

    const chunkRes = await fetch(
      `/api/documents/upload?uploadId=${uploadId}&chunkIndex=${i}&totalChunks=${totalChunks}`,
      { method: "PUT", body: buffer }
    );
    if (!chunkRes.ok) {
      const err = await chunkRes.json();
      throw new Error(err?.error || `Chunk ${i} upload failed`);
    }

    const chunkData = await chunkRes.json();
    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));

    if (chunkData.done) {
      result = {
        fileId: chunkData.fileId,
        url: chunkData.url,
        originalName: chunkData.originalName,
        fileSize: chunkData.fileSize,
        fileType: chunkData.fileType,
      };
    }
  }

  if (!result) throw new Error("Upload completed but no result returned");
  return result;
}
