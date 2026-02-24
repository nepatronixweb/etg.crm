import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Checklist from "@/models/Checklist";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    if (country) {
      const checklist = await Checklist.findOne({ country });
      return NextResponse.json(checklist || { country, documents: [] });
    }

    const checklists = await Checklist.find().sort({ country: 1 });
    return NextResponse.json(checklists);
  } catch {
    return NextResponse.json({ error: "Failed to fetch checklists" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const checklist = await Checklist.findOneAndUpdate(
      { country: body.country },
      body,
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Checklist saved", checklist });
  } catch {
    return NextResponse.json({ error: "Failed to save checklist" }, { status: 500 });
  }
}
