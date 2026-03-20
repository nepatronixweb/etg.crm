import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Student from "@/models/Student";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { stage, remarks, standing, statusDate } = await req.json();

    if (!stage) {
      return NextResponse.json({ error: "Stage is required" }, { status: 400 });
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Add new application progress entry
    const newEntry = {
      stage,
      remarks: remarks || "",
      standing: standing || "",
      statusDate: statusDate ? new Date(statusDate) : new Date(),
      changedBy: session.user.id || session.user.email,
      changedByName: session.user.name || session.user.email,
    };

    student.applicationProgressHistory = student.applicationProgressHistory || [];
    student.applicationProgressHistory.push(newEntry);

    await student.save();

    return NextResponse.json({
      message: "Application progress recorded",
      entry: newEntry,
    });
  } catch (error) {
    console.error("Error recording application progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findById(id).lean();
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      applicationProgressHistory: student.applicationProgressHistory || [],
    });
  } catch (error) {
    console.error("Error fetching application progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
