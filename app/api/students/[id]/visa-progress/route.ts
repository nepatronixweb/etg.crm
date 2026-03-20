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

    const { country, stage, remarks, standing, statusDate } = await req.json();

    if (!country || !stage) {
      return NextResponse.json(
        { error: "Country and stage are required" },
        { status: 400 }
      );
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Add new visa progress entry
    const newEntry = {
      country,
      stage,
      remarks: remarks || "",
      standing: standing || "",
      statusDate: statusDate ? new Date(statusDate) : new Date(),
      changedBy: session.user.id || session.user.email,
      changedByName: session.user.name || session.user.email,
    };

    student.visaProgressHistory = student.visaProgressHistory || [];
    student.visaProgressHistory.push(newEntry);

    await student.save();

    return NextResponse.json({
      message: "Visa progress recorded",
      entry: newEntry,
    });
  } catch (error) {
    console.error("Error recording visa progress:", error);
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
      visaProgressHistory: student.visaProgressHistory || [],
    });
  } catch (error) {
    console.error("Error fetching visa progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
