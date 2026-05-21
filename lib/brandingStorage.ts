import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import {
  brandingFileUrl,
  parseBrandingFileId,
  BRANDING_FILE_ROUTE,
} from "@/lib/brandingUrls";

export { BRANDING_FILE_ROUTE, brandingFileUrl, parseBrandingFileId, resolveBrandingAssetUrl } from "@/lib/brandingUrls";

const BUCKET_NAME = "branding";

export type BrandingAssetKind = "logo" | "qr" | "favicon";

export async function getBrandingBucket(): Promise<mongoose.mongo.GridFSBucket> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export async function deleteBrandingFileByPath(path: string | null | undefined): Promise<void> {
  const id = parseBrandingFileId(path);
  if (!id) return;
  try {
    const bucket = await getBrandingBucket();
    await bucket.delete(new mongoose.Types.ObjectId(id));
  } catch {
    // Previous file may already be gone
  }
}

export async function uploadBrandingFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata: { organizationId: string | null; kind: BrandingAssetKind }
): Promise<string> {
  const bucket = await getBrandingBucket();
  const safeName = filename.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180) || `${metadata.kind}.png`;

  const fileId = await new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(safeName, {
      metadata: {
        kind: metadata.kind,
        organizationId: metadata.organizationId ?? "platform",
        contentType,
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id as mongoose.Types.ObjectId));
    stream.end(buffer);
  });

  return brandingFileUrl(fileId.toString());
}
