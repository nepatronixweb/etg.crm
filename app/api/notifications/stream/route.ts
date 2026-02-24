import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const encoder = new TextEncoder();

  // Track the timestamp of the last check so we only send genuinely new items
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      await connectDB();

      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      };

      // Send initial unread count immediately on connect
      try {
        const unreadCount = await Notification.countDocuments({
          recipient: userId,
          read: false,
        });
        const recent = await Notification.find({ recipient: userId })
          .sort({ createdAt: -1 })
          .limit(15)
          .lean();
        send({ type: "init", unreadCount, notifications: recent });
      } catch {
        send({ type: "init", unreadCount: 0, notifications: [] });
      }

      // Poll every 5 seconds for new notifications
      const interval = setInterval(async () => {
        try {
          const since = lastCheck;
          lastCheck = new Date();

          const newNotifs = await Notification.find({
            recipient: userId,
            createdAt: { $gt: since },
          })
            .sort({ createdAt: -1 })
            .lean();

          const unreadCount = await Notification.countDocuments({
            recipient: userId,
            read: false,
          });

          if (newNotifs.length > 0) {
            send({ type: "new", notifications: newNotifs, unreadCount });
          } else {
            // heartbeat — keeps the connection alive and syncs unread count
            send({ type: "heartbeat", unreadCount });
          }
        } catch {
          send({ type: "heartbeat", unreadCount: 0 });
        }
      }, 5000);

      // Cleanup when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
