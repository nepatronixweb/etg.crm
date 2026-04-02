import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Attendance from "@/models/Attendance";
import "@/models/User";
import { getClientIp, getTodayYmd } from "@/lib/hr/dateAndIp";
import { resolveCheckInStatus } from "@/lib/hr/attendanceStatus";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { lat?: number; lng?: number } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const lat = typeof body.lat === "number" ? body.lat : undefined;
    const lng = typeof body.lng === "number" ? body.lng : undefined;

    await connectDB();
    const date = getTodayYmd();
    const existing = await Attendance.findOne({
      userId: session.user.id,
      date,
    }).lean();

    if (existing?.checkIn) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
    }

    const status = resolveCheckInStatus(req, lat, lng);
    const ip = getClientIp(req);
    const now = new Date();

    try {
      const doc = await Attendance.create({
        userId: session.user.id,
        date,
        checkIn: now,
        ip,
        location: {
          lat: lat ?? 0,
          lng: lng ?? 0,
        },
        status,
      });
      return NextResponse.json({
        ok: true,
        attendance: {
          _id: doc._id,
          date: doc.date,
          checkIn: doc.checkIn,
          status: doc.status,
          ip: doc.ip,
          location: doc.location,
        },
      });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 });
      }
      throw e;
    }
  } catch (err) {
    console.error("POST /api/hr/checkin", err);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
