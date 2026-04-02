import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import "@/models/User";
import { getTodayYmd } from "@/lib/hr/dateAndIp";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const date = getTodayYmd();
    const doc = await Attendance.findOne({ userId: session.user.id, date });
    if (!doc) {
      return NextResponse.json({ error: "No attendance record for today — check in first" }, { status: 400 });
    }
    if (!doc.checkIn) {
      return NextResponse.json({ error: "Not checked in" }, { status: 400 });
    }
    if (doc.checkOut) {
      return NextResponse.json({ error: "Already checked out" }, { status: 400 });
    }

    doc.checkOut = new Date();
    await doc.save();

    return NextResponse.json({
      ok: true,
      attendance: {
        _id: doc._id,
        date: doc.date,
        checkIn: doc.checkIn,
        checkOut: doc.checkOut,
        status: doc.status,
      },
    });
  } catch (err) {
    console.error("POST /api/hr/checkout", err);
    return NextResponse.json({ error: "Check-out failed" }, { status: 500 });
  }
}
