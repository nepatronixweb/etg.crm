import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await connectDB();

    const { content } = await req.json();
    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    student.notes.push({
      content,
      addedBy: session.user.id,
      addedByName: session.user.name,
      addedByRole: session.user.role as never,
      createdAt: new Date(),
    });
    await student.save();

    return NextResponse.json({ message: "Note added", notes: student.notes });
  } catch {
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
