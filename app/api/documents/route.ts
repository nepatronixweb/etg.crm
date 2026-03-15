import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import connectDB from "@/lib/mongodb";
import StudentDocument from "@/models/Document";
import ActivityLog from "@/models/ActivityLog";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const student = searchParams.get("student");
    const lead = searchParams.get("lead");
    const country = searchParams.get("country");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (student) filter.student = student;
    if (lead) filter.lead = lead;
    if (country) filter.country = country;

    const documents = await StudentDocument.find(filter)
      .populate("uploadedBy", "name")
      .populate("student", "name phone")
      .sort({ createdAt: -1 });

    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const contentType = req.headers.get("content-type") || "";
    let studentId: string | null = null;
    let leadId: string | null = null;
    let country = "";
    let documentName = "";
    let filePath = "";
    let originalName = "";
    let fileSize = 0;
    let fileType = "";

    if (contentType.includes("application/json")) {
      // Client-side upload: blob URL already exists
      const body = await req.json();
      studentId = body.studentId || null;
      leadId = body.leadId || null;
      country = body.country || "";
      documentName = body.name || "";
      filePath = body.blobUrl;
      originalName = body.originalName || documentName;
      fileSize = body.fileSize || 0;
      fileType = body.fileType || "";
      if (!filePath) return NextResponse.json({ error: "blobUrl is required" }, { status: 400 });
    } else {
      // Legacy FormData upload (small files / leads page)
      const formData = await req.formData();
      const file = formData.get("file") as File;
      studentId = formData.get("studentId") as string | null;
      leadId = formData.get("leadId") as string | null;
      country = (formData.get("country") as string) || "";
      documentName = formData.get("name") as string;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
      const ownerId = (studentId || leadId)!;
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const blob = await put(`uploads/${ownerId}/${fileName}`, file, { access: "public" });
      filePath = blob.url;
      originalName = file.name;
      fileSize = file.size;
      fileType = file.type;
    }

    if (!studentId && !leadId) return NextResponse.json({ error: "studentId or leadId required" }, { status: 400 });

    const docData: Record<string, unknown> = {
      name: documentName || originalName,
      originalName,
      filePath,
      fileSize,
      fileType,
      uploadedBy: session.user.id,
    };
    if (studentId) { docData.student = studentId; docData.country = country; }
    if (leadId) docData.lead = leadId;

    const doc = await StudentDocument.create(docData);

    await ActivityLog.create({
      user: session.user.id,
      userName: session.user.name,
      userRole: session.user.role,
      action: "UPLOAD",
      module: "Documents",
      targetId: doc._id.toString(),
      targetName: documentName || originalName,
      details: studentId
        ? `Document uploaded for student ${studentId}, country ${country}`
        : `Document uploaded for lead ${leadId}`,
    });

    return NextResponse.json({ message: "Document uploaded", document: doc }, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
