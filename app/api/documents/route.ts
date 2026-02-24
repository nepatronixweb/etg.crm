import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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
      .sort({ createdAt: -1 });

    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const studentId = formData.get("studentId") as string | null;
    const leadId = formData.get("leadId") as string | null;
    const country = (formData.get("country") as string) || "";
    const documentName = formData.get("name") as string;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!studentId && !leadId) return NextResponse.json({ error: "studentId or leadId required" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ownerId = (studentId || leadId)!;
    const uploadDir = path.join(process.cwd(), "public", "uploads", ownerId);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const publicPath = `/uploads/${ownerId}/${fileName}`;

    const docData: Record<string, unknown> = {
      name: documentName || file.name,
      originalName: file.name,
      filePath: publicPath,
      fileSize: file.size,
      fileType: file.type,
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
      targetName: documentName || file.name,
      details: studentId
        ? `Document uploaded for student ${studentId}, country ${country}`
        : `Document uploaded for lead ${leadId}`,
    });

    return NextResponse.json({ message: "Document uploaded", document: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
