import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { auth } from "@/lib/auth";

// GET /api/notifications  — fetch current user's notifications
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
    const unreadOnly = searchParams.get("unread") === "true";

    const filter: Record<string, unknown> = { recipient: session.user.id };
    if (unreadOnly) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipient: session.user.id, read: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications  — mark all as read (or body { id } for single)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const body = await req.json().catch(() => ({}));
    if (body?.id) {
      await Notification.updateOne(
        { _id: body.id, recipient: session.user.id },
        { read: true }
      );
    } else {
      await Notification.updateMany(
        { recipient: session.user.id, read: false },
        { read: true }
      );
    }

    return NextResponse.json({ message: "Marked as read" });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
