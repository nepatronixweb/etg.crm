import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StudentDocument from "@/models/Document";
import fs from "fs/promises";
import path from "path";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const doc = await StudentDocument.findByIdAndUpdate(
    id,
    {
      ...body,
      ...(body.isVerified !== undefined && {
        verifiedBy: body.isVerified ? session.user.id : null,
      }),
    },
    { new: true }
  );

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "super_admin" && role !== "branch_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const doc = await StudentDocument.findById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete file from disk
  try {
    const fullPath = path.join(process.cwd(), "public", doc.filePath);
    await fs.unlink(fullPath);
  } catch {
    // File may not exist on disk, continue
  }

  await StudentDocument.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
